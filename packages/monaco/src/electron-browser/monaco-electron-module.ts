/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from "path";
import { ContainerModule } from "inversify";
import { loadVsRequire, loadMonaco } from "../browser/monaco-loader";

export { ContainerModule };

const s = <any>self;

/**
 * We cannot use `FileUri#create` because URIs with file scheme cannot be properly decoded via the AMD loader.
 * So if you have a FS path on Windows: `C:\Users\foo`, then you will get a URI `file:///c%3A/Users/foo` which
 * will be converted into the `c%3A/Users/foo` FS path on Windows by the AMD loader.
 */
const uriFromPath = (filePath: string) => {
    let pathName = path.resolve(filePath).replace(/\\/g, '/');
    if (pathName.length > 0 && pathName.charAt(0) !== '/') {
        pathName = '/' + pathName;
    }
    return encodeURI('file://' + pathName);
};

export default loadVsRequire(global)
    .then(vsRequire => {
        const baseUrl = uriFromPath(__dirname);
        vsRequire.config({ baseUrl });

        // workaround monaco-css not understanding the environment
        s.module = undefined;
        // workaround monaco-typescript not understanding the environment
        s.process.browser = true;
        return loadMonaco(vsRequire);
    })
    .then(() => import('../browser/monaco-frontend-module'))
    .then(module => module.default);