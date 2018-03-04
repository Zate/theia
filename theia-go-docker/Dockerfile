FROM alpine:3.7 as theia-alpinelibc

ENV LANG=C.UTF-8

# Here we install GNU libc (aka glibc) and set C.UTF-8 locale as default.

RUN ALPINE_GLIBC_BASE_URL="https://github.com/sgerrand/alpine-pkg-glibc/releases/download" && \
    ALPINE_GLIBC_PACKAGE_VERSION="2.27-r0" && \
    ALPINE_GLIBC_BASE_PACKAGE_FILENAME="glibc-$ALPINE_GLIBC_PACKAGE_VERSION.apk" && \
    ALPINE_GLIBC_BIN_PACKAGE_FILENAME="glibc-bin-$ALPINE_GLIBC_PACKAGE_VERSION.apk" && \
    ALPINE_GLIBC_I18N_PACKAGE_FILENAME="glibc-i18n-$ALPINE_GLIBC_PACKAGE_VERSION.apk" && \
    apk add --no-cache --virtual=.build-dependencies wget ca-certificates && \
    wget \
    "https://raw.githubusercontent.com/sgerrand/alpine-pkg-glibc/master/sgerrand.rsa.pub" \
    -O "/etc/apk/keys/sgerrand.rsa.pub" && \
    wget \
    "$ALPINE_GLIBC_BASE_URL/$ALPINE_GLIBC_PACKAGE_VERSION/$ALPINE_GLIBC_BASE_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_BASE_URL/$ALPINE_GLIBC_PACKAGE_VERSION/$ALPINE_GLIBC_BIN_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_BASE_URL/$ALPINE_GLIBC_PACKAGE_VERSION/$ALPINE_GLIBC_I18N_PACKAGE_FILENAME" && \
    apk add --no-cache \
    "$ALPINE_GLIBC_BASE_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_BIN_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_I18N_PACKAGE_FILENAME" && \
    \
    rm "/etc/apk/keys/sgerrand.rsa.pub" && \
    /usr/glibc-compat/bin/localedef --force --inputfile POSIX --charmap UTF-8 "$LANG" || true && \
    echo "export LANG=$LANG" > /etc/profile.d/locale.sh && \
    \
    apk del glibc-i18n && \
    \
    rm "/root/.wget-hsts" && \
    apk del .build-dependencies && \
    rm \
    "$ALPINE_GLIBC_BASE_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_BIN_PACKAGE_FILENAME" \
    "$ALPINE_GLIBC_I18N_PACKAGE_FILENAME"

FROM theia-alpinelibc as theia-node8

ENV NODE_VERSION 8.9.4

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache \
    libstdc++ \
    && apk add --no-cache --virtual .build-deps \
    binutils-gold \
    curl \
    g++ \
    gcc \
    gnupg \
    libgcc \
    linux-headers \
    make \
    python \
    # gpg keys listed at https://github.com/nodejs/node#release-team
    && for key in \
    94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
    FD3A5288F042B6850C66B31F09FE44734EB7990E \
    71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
    DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
    C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
    B9AE9905FFD7803F25714661B63B535A4C206CA9 \
    56730D5401028683275BD23C23EFEFE93C4CFFFE \
    77984A986EBC2AA786BC0F66B01FBB92821C587A \
    ; do \
    gpg --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" || \
    gpg --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" || \
    gpg --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
    done \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION.tar.xz" \
    && curl -SLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xf "node-v$NODE_VERSION.tar.xz" \
    && cd "node-v$NODE_VERSION" \
    && ./configure \
    && make -j$(getconf _NPROCESSORS_ONLN) \
    && make install \
    && apk del .build-deps \
    && cd .. \
    && rm -Rf "node-v$NODE_VERSION" \
    && rm "node-v$NODE_VERSION.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt

ENV YARN_VERSION 1.3.2

RUN apk add --no-cache --virtual .build-deps-yarn curl gnupg tar \
    && for key in \
    6A010C5166006599AA17F08146C2130DFD2497F5 \
    ; do \
    gpg --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" || \
    gpg --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" || \
    gpg --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
    done \
    && curl -fSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
    && curl -fSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz.asc" \
    && gpg --batch --verify yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
    && mkdir -p /opt/yarn \
    && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/yarn --strip-components=1 \
    && ln -s /opt/yarn/bin/yarn /usr/local/bin/yarn \
    && ln -s /opt/yarn/bin/yarn /usr/local/bin/yarnpkg \
    && rm yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
    && apk del .build-deps-yarn

FROM theia-node8 as theia-go
ENV GOLANG_VERSION=1.9.4

RUN apk add --no-cache wget git bash ca-certificates make gcc g++ python go \
    && export GOROOT_BOOTSTRAP="$(go env GOROOT)" GOOS="$(go env GOOS)" GOARCH="$(go env GOARCH)" \
    GOHOSTOS="$(go env GOHOSTOS)" GOHOSTARCH="$(go env GOHOSTARCH)" \
    && export GO386='387' \
    && wget -O go.tgz "https://golang.org/dl/go$GOLANG_VERSION.src.tar.gz" \
    && tar -C /usr/local -xzf go.tgz \
    && rm go.tgz \
    && cd /usr/local/go/src \
    && for p in /go-alpine-patches/*.patch \
    ; do \
    [ -f "$p" ] || continue; \
    patch -p2 -i "$p"; \
    done \
    && ./make.bash \
    && rm -rf /go-alpine-patches 

FROM theia-go
ARG version=next
WORKDIR /home/theia
ADD $version.package.json ./package.json
RUN apk add --no-cache git bash-completion openssh-client ca-certificates libstdc++ bash \
    && apk add --no-cache --virtual .build-deps \
    binutils-gold \
    curl \
    g++ \
    gcc \
    gnupg \
    libgcc \
    linux-headers \
    make \
    python \
    tar \
    musl-dev \
    go \
    wget \
    xz \
    && apk -U upgrade \
    && cd /usr/local/bin \ 
    && ln -s node nodejs \
    && cd ~ \
    && mkdir ~/.bash \
    && cd ~/.bash \
    && git clone https://github.com/jimeh/git-aware-prompt \
    && cd ~ \
    && echo 'export GITAWAREPROMPT=~/.bash/git-aware-prompt' >> ~/.bashrc \
    && echo 'source "${GITAWAREPROMPT}/main.sh"' >> ~/.bashrc \
    && echo 'export PS1="\${debian_chroot:+(\$debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\] \[$txtcyn\]\$git_branch\[$txtred\]\$git_dirty\[$txtrst\]\$ "' >> ~/.bashrc \
    && source ~/.bashrc \
    && cd /home/theia \
    && yarn --cache-folder ./ycache \
    && rm -rf ./ycache \
    && yarn theia build \
    && yarn cache clean \
    && mkdir -p /home/project/go \
    && export PATH="/usr/local/go/bin:$PATH" \
    && export GOPATH="/home/project/go" \
    && export PATH=$GOPATH/bin:$PATH \
    && go version \
    && mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH" \
    && go get -u github.com/ramya-rao-a/go-outline \ 
    && echo "go-outline installed." \
    && go get -u github.com/acroca/go-symbols \
    && echo "go-symbols installed." \
    && go get -u github.com/nsf/gocode \
    && echo "gocode installed." \
    && go get -u github.com/rogpeppe/godef \
    && echo "godef installed." \
    && go get -u golang.org/x/tools/cmd/godoc \
    && echo "godoc installed." \
    && go get -u github.com/zmb3/gogetdoc \
    && echo "gogetdoc installed." \
    && go get -u github.com/golang/lint/golint \
    && echo "golint installed." \
    && go get -u github.com/fatih/gomodifytags \
    && echo "gomodifytags installed." \
    && go get -u github.com/uudashr/gopkgs/cmd/gopkgs \
    && echo "gopkgs installed." \
    && go get -u golang.org/x/tools/cmd/gorename \
    && echo "gorename installed." \
    && go get -u sourcegraph.com/sqs/goreturns \
    && echo "goreturns installed." \
    && go get -u github.com/cweill/gotests/... \
    && echo "gotests installed." \
    && go get -u golang.org/x/tools/cmd/guru \
    && echo "guru installed." \
    && go get -u github.com/josharian/impl \
    && echo "impl installed." \
    && go get -u github.com/haya14busa/goplay/cmd/goplay \
    && echo "goplay installed." \
    && go get -u github.com/golang/dep/cmd/dep \
    && echo "dep installed." \
    && go get -u github.com/davidrjenni/reftools/cmd/fillstruct \
    && echo "fillstruct installed." \
    && echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf \
    && yarn --cache-folder ./ycache \
    && rm -rf ./ycache \
    && yarn theia build \
    && rm -rf ./node_modules/electron* \
    && yarn cache clean \
    # Optional for my personal use
    && apk del .build-deps \
    && printf '[user]\n    name = Zate\n    email = zate75@gmail.com\n' > /root/.gitconfig \
    && mkdir -p /root/.go \
    && echo '{"toolsGopath":"/root/go"}' > /root/.go/go.json


EXPOSE 3000
ENV SHELL /bin/bash
ENV USE_LOCAL_GIT true
ENV PATH "/usr/local/go/bin:$PATH"
ENV GOPATH "/home/project/go"
ENV PATH "$GOPATH/bin:$PATH"
ENV TDIR "/home/theia"
ADD docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]



