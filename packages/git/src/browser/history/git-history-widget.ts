/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { h } from "@phosphor/virtualdom";
import { DiffUris } from '@theia/editor/lib/browser/diff-uris';
import { OpenerService, open, StatefulWidget, SELECTED_CLASS, WidgetManager, ApplicationShell } from "@theia/core/lib/browser";
import { GIT_RESOURCE_SCHEME } from '../git-resource';
import URI from "@theia/core/lib/common/uri";
import { GIT_HISTORY, GIT_HISTORY_MAX_COUNT } from './git-history-contribution';
import { LabelProvider } from '@theia/core/lib/browser/label-provider';
import { GitRepositoryProvider } from '../git-repository-provider';
import { GitFileStatus, Git, GitFileChange } from '../../common';
import { GitBaseWidget } from "../git-base-widget";
import { GitFileChangeNode } from "../git-widget";
import { SelectionService } from "@theia/core";
import { Message } from "@phosphor/messaging";
import { ElementExt } from "@phosphor/domutils";
import { FileSystem } from "@theia/filesystem/lib/common";
import { Key } from "@theia/core/lib/browser/keys";
import { GitDiffContribution } from "../diff/git-diff-contribution";
import { GitCommitDetailWidget, GitCommitDetailWidgetOptions } from "./git-commit-detail-widget";
import { GitCommitDetailWidgetFactory } from "./git-commit-detail-widget-factory";

export interface GitCommitNode {
    readonly authorName: string;
    readonly authorEmail: string;
    readonly authorDate: Date;
    readonly authorDateRelative: string;
    readonly commitMessage: string;
    readonly messageBody?: string;
    readonly fileChangeNodes: GitFileChangeNode[];
    readonly commitSha: string;
    expanded: boolean;
    selected: boolean;
}

export namespace GitCommitNode {
    export function is(node: any): node is GitCommitNode {
        return 'commitSha' in node && 'commitMessage' in node && 'fileChangeNodes' in node;
    }
}

export enum SelectDirection {
    NEXT, PREVIOUS
}

export type GitHistoryListNode = (GitCommitNode | GitFileChangeNode);

@injectable()
export class GitHistoryWidget extends GitBaseWidget implements StatefulWidget {
    protected options: Git.Options.Log;
    protected commits: GitCommitNode[];
    protected historyList: GitHistoryListNode[];
    protected ready: boolean;
    protected singleFileMode: boolean;

    constructor(
        @inject(GitRepositoryProvider) protected readonly repositoryProvider: GitRepositoryProvider,
        @inject(LabelProvider) protected readonly labelProvider: LabelProvider,
        @inject(OpenerService) protected readonly openerService: OpenerService,
        @inject(ApplicationShell) protected readonly shell: ApplicationShell,
        @inject(SelectionService) protected readonly selectionService: SelectionService,
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(Git) protected readonly git: Git,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
        @inject(GitDiffContribution) protected readonly diffContribution: GitDiffContribution) {
        super(repositoryProvider, labelProvider);
        this.id = GIT_HISTORY;
        this.title.label = "Git History";
        this.addClass('theia-git');

        this.node.tabIndex = 0;

        selectionService.onSelectionChanged((c: GitHistoryListNode) => {
            c.selected = true;
            this.update();
        });
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);

        const selected = this.node.getElementsByClassName(SELECTED_CLASS)[0];
        const scrollArea = document.getElementById('git-history-list-container');
        if (selected && scrollArea) {
            ElementExt.scrollIntoViewIfNeeded(scrollArea, selected);
        }
    }

    async setContent(options?: Git.Options.Log) {
        this.options = options || {};
        this.commits = [];
        this.ready = false;
        if (options && options.uri) {
            const fileStat = await this.fileSystem.getFileStat(options.uri);
            this.singleFileMode = !fileStat.isDirectory;
        }
        this.addCommits(options);
        this.update();
    }

    protected addCommits(options?: Git.Options.Log) {
        const repository = this.repositoryProvider.selectedRepository;
        if (repository) {
            const log = this.git.log(repository, options);
            log.then(async changes => {
                if (this.commits.length > 0) {
                    changes = changes.slice(1);
                }
                if (changes.length > 0) {
                    const commits: GitCommitNode[] = [];
                    for (const commit of changes) {
                        const fileChangeNodes: GitFileChangeNode[] = [];
                        for (const fileChange of commit.fileChanges) {
                            const fileChangeUri = new URI(fileChange.uri);
                            const [icon, label, description] = await Promise.all([
                                this.labelProvider.getIcon(fileChangeUri),
                                this.labelProvider.getName(fileChangeUri),
                                this.relativePath(fileChangeUri.parent)
                            ]);
                            const caption = this.computeCaption(fileChange);
                            fileChangeNodes.push({
                                ...fileChange, icon, label, description, caption, commitSha: commit.sha
                            });
                        }
                        commits.push({
                            authorName: commit.author.name,
                            authorDate: commit.author.date,
                            authorEmail: commit.author.email,
                            authorDateRelative: commit.authorDateRelative,
                            commitSha: commit.sha,
                            commitMessage: commit.summary,
                            messageBody: commit.body,
                            fileChangeNodes,
                            expanded: false,
                            selected: false
                        });
                    }
                    this.commits.push(...commits);
                    this.ready = true;
                    this.update();
                }
                const ll = this.node.getElementsByClassName('history-lazy-loading')[0];
                if (ll && ll.className === "history-lazy-loading show") {
                    ll.className = "history-lazy-loading hide";
                }
            });
        }
    }

    storeState(): object {
        const { commits, options, singleFileMode } = this;
        return {
            commits,
            options,
            singleFileMode
        };
    }

    // tslint:disable-next-line:no-any
    restoreState(oldState: any): void {
        this.commits = oldState['commits'];
        this.options = oldState['options'];
        this.singleFileMode = oldState['singleFileMode'];
        this.ready = true;
        this.update();
    }

    protected render(): h.Child {
        this.historyList = [];
        const containers = [];
        if (this.ready) {
            containers.push(this.renderHistoryHeader());
            containers.push(this.renderCommitList());
            containers.push(h.div({ className: 'history-lazy-loading' }, h.span({ className: "fa fa-spinner fa-pulse fa-2x fa-fw" })));
        } else {
            containers.push(h.div({ className: 'spinnerContainer' }, h.span({ className: 'fa fa-spinner fa-pulse fa-3x fa-fw' })));
        }
        return h.div({ className: "git-diff-container" }, ...containers);
    }

    protected renderHistoryHeader(): h.Child {
        const elements = [];
        if (this.options.uri) {
            const path = this.relativePath(this.options.uri);
            if (path.length > 0) {
                elements.push(h.div({ className: 'header-row' },
                    h.div({ className: 'theia-header' }, 'path:'),
                    h.div({ className: 'header-value' }, '/' + path)));
            }
        }
        const header = h.div({ className: 'theia-header' }, `Commits`);

        return h.div({ className: "diff-header" }, ...elements, header);
    }

    protected renderCommitList(): h.Child {
        const theList: h.Child[] = [];

        for (const commit of this.commits) {
            const head = this.renderCommit(commit);
            const body = commit.expanded ? this.renderFileChangeList(commit.fileChangeNodes, commit.commitSha) : "";
            theList.push(h.div({ className: "commitListElement" }, head, body));
        }
        const commitList = h.div({ className: "commitList" }, ...theList);
        return h.div({
            className: "listContainer",
            id: "git-history-list-container",
            onscroll: e => {
                const el = (e.srcElement as HTMLElement);
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 5) {
                    const ll = this.node.getElementsByClassName('history-lazy-loading')[0];
                    ll.className = "history-lazy-loading show";
                    this.addCommits({
                        range: {
                            toRevision: this.commits[this.commits.length - 1].commitSha
                        },
                        maxCount: GIT_HISTORY_MAX_COUNT
                    });
                }
            }
        }, commitList);
    }

    protected renderCommit(commit: GitCommitNode): h.Child {
        this.historyList.push(commit);
        let expansionToggleIcon = "caret-right";
        if (commit && commit.expanded) {
            expansionToggleIcon = "caret-down";
        }
        const headEl = [];
        const expansionToggle = h.div(
            {
                className: "expansionToggle noselect"
            },
            h.div({ className: "toggle" },
                h.div({ className: "number" }, commit.fileChangeNodes.length.toString()),
                h.div({ className: "icon fa fa-" + expansionToggleIcon }))
        );
        const label = h.div({ className: `headLabelContainer${this.singleFileMode ? ' singleFileMode' : ''}` },
            h.div(
                {
                    className: "headLabel noWrapInfo noselect"
                },
                commit.commitMessage),
            h.div(
                {
                    className: "commitTime noWrapInfo noselect"
                },
                commit.authorDateRelative + ' by ' + commit.authorName
            )
        );
        const detailBtn = h.div({
            className: "fa fa-eye detailButton",
            onclick: () => {
                const range = {
                    fromRevision: commit.commitSha + "~1",
                    toRevision: commit.commitSha
                };
                this.widgetManager.getOrCreateWidget(GitCommitDetailWidgetFactory.ID,
                    <GitCommitDetailWidgetOptions>{
                        widgetId: "commit" + commit.commitSha,
                        widgetLabel: "Commit" + commit.commitSha,
                        commit,
                        diffOptions: { range }
                    }).then(async (widget: GitCommitDetailWidget) => {
                        await widget.setContent({ range });
                        return widget;
                    }).then(widget => {
                        this.shell.addWidget(widget, {
                            area: 'left'
                        });
                        this.shell.activateWidget(widget.id);
                    });
            }
        });
        headEl.push(label, detailBtn);
        if (!this.singleFileMode) {
            headEl.push(expansionToggle);
        }
        const content = h.div({ className: "headContent" }, ...headEl);
        return h.div({
            className: `containerHead${commit.selected ? ' ' + SELECTED_CLASS : ''}`,
            onclick: () => {
                if (commit.selected && !this.singleFileMode) {
                    commit.expanded = !commit.expanded;
                    this.update();
                } else {
                    this.selectNode(commit);
                }
            },
            ondblclick: () => {
                if (this.singleFileMode) {
                    this.openFile(commit.fileChangeNodes[0], commit.commitSha);
                }
            }
        }, content);
    }

    protected renderFileChangeList(fileChanges: GitFileChangeNode[], commitSha: string): h.Child {

        this.historyList.push(...fileChanges);

        const files: h.Child[] = [];

        for (const fileChange of fileChanges) {
            const fileChangeElement: h.Child = this.renderGitItem(fileChange, commitSha);
            files.push(fileChangeElement);
        }
        const commitFiles = h.div({ className: "commitFileList" }, ...files);
        return h.div({ className: "commitBody" }, commitFiles);
    }

    protected renderGitItem(change: GitFileChangeNode, commitSha: string): h.Child {
        const iconSpan = h.span({ className: change.icon + ' file-icon' });
        const nameSpan = h.span({ className: 'name' }, change.label + ' ');
        const pathSpan = h.span({ className: 'path' }, change.description);
        const elements = [];
        elements.push(h.div({
            title: change.caption,
            className: 'noWrapInfo',
            ondblclick: () => {
                this.openFile(change, commitSha);
            },
            onclick: () => {
                this.selectNode(change);
            }
        }, iconSpan, nameSpan, pathSpan));
        if (change.extraIconClassName) {
            elements.push(h.div({
                title: change.caption,
                className: change.extraIconClassName
            }));
        }
        elements.push(h.div({
            title: change.caption,
            className: 'status staged ' + GitFileStatus[change.status].toLowerCase()
        }, this.getStatusCaption(change.status, true).charAt(0)));
        return h.div({ className: `gitItem noselect${change.selected ? ' ' + SELECTED_CLASS : ''}` }, ...elements);
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addKeyListener(this.node, Key.ARROW_LEFT, () => this.handleLeft());
        this.addKeyListener(this.node, Key.ARROW_RIGHT, () => this.handleRight());
        this.addKeyListener(this.node, Key.ARROW_UP, () => this.handleUp());
        this.addKeyListener(this.node, Key.ARROW_DOWN, () => this.handleDown());
        this.addKeyListener(this.node, Key.ENTER, () => this.handleEnter());
    }

    protected handleLeft(): void {
        const selected = this.getSelected();
        if (selected) {
            const idx = this.commits.findIndex(c => c.commitSha === selected.commitSha);
            if (GitCommitNode.is(selected)) {
                if (selected.expanded) {
                    selected.expanded = false;
                } else {
                    if (idx > 0) {
                        this.selectNode(this.commits[idx - 1]);
                    }
                }
            } else if (GitFileChangeNode.is(selected)) {
                this.selectNode(this.commits[idx]);
            }
        }
        this.update();
    }

    protected handleRight(): void {
        const selected = this.getSelected();
        if (selected) {
            if (GitCommitNode.is(selected) && !selected.expanded && !this.singleFileMode) {
                selected.expanded = true;
            } else {
                this.selectNodeByDirection(SelectDirection.NEXT);
            }
        }
        this.update();
    }

    protected handleUp(): void {
        this.selectNodeByDirection(SelectDirection.PREVIOUS);
    }

    protected handleDown(): void {
        this.selectNodeByDirection(SelectDirection.NEXT);
    }

    protected handleEnter(): void {
        const selected = this.getSelected();
        if (selected) {
            if (GitCommitNode.is(selected)) {
                if (this.singleFileMode) {
                    this.openFile(selected.fileChangeNodes[0], selected.commitSha);
                } else {
                    selected.expanded = !selected.expanded;
                }
            } else if (GitFileChangeNode.is(selected)) {
                this.openFile(selected, selected.commitSha || "");
            }
        }
        this.update();
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected getSelected(): GitHistoryListNode | undefined {
        return this.historyList ? this.historyList.find(c => c.selected || false) : undefined;
    }

    protected selectNode(node: GitHistoryListNode) {
        const n = this.getSelected();
        if (n) {
            n.selected = false;
        }
        this.selectionService.selection = node;
    }

    protected selectNodeByDirection(dir: SelectDirection) {
        const selIdx = this.historyList.findIndex(c => c.selected || false);
        let nodeIdx = selIdx;
        if (dir === SelectDirection.NEXT && selIdx < this.historyList.length - 1) {
            nodeIdx = selIdx + 1;
        } else if (dir === SelectDirection.PREVIOUS && selIdx > 0) {
            nodeIdx = selIdx - 1;
        }
        this.selectNode(this.historyList[nodeIdx]);
    }

    protected openFile(change: GitFileChange, commitSha: string) {
        const uri: URI = new URI(change.uri);
        let fromURI = change.oldUri ? new URI(change.oldUri) : uri; // set oldUri on renamed and copied
        fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(commitSha + "~1");
        const toURI = uri.withScheme(GIT_RESOURCE_SCHEME).withQuery(commitSha);
        let uriToOpen = uri;
        if (change.status === GitFileStatus.Deleted) {
            uriToOpen = fromURI;
        } else if (change.status === GitFileStatus.New) {
            uriToOpen = toURI;
        } else {
            uriToOpen = DiffUris.encode(fromURI, toURI, uri.displayName);
        }
        open(this.openerService, uriToOpen);
    }

}
