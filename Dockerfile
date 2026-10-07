FROM debian:bookworm-slim

ENV RUBY_VERSION=2.2.1
ENV BUNDLER_VERSION=1.10.6
ENV OPENSSL_VERSION=1.0.2u
ENV DEBIAN_FRONTEND=noninteractive

# Build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    autoconf \
    bison \
    ca-certificates \
    curl \
    git \
    libffi-dev \
    libgdbm-dev \
    libncurses5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libyaml-dev \
    nodejs \
    sqlite3 \
    zlib1g-dev \
    perl \
    && rm -rf /var/lib/apt/lists/*

# Build OpenSSL 1.0.2u with position-independent code
RUN curl -fL \
    https://www.openssl.org/source/old/1.0.2/openssl-1.0.2u.tar.gz \
    -o /tmp/openssl.tar.gz \
    && mkdir -p /usr/src/openssl \
    && tar -xzf /tmp/openssl.tar.gz -C /usr/src/openssl --strip-components=1 \
    && cd /usr/src/openssl \
    && ./config \
        --prefix=/opt/openssl-1.0.2u \
        --openssldir=/opt/openssl-1.0.2u \
        no-shared \
        -fPIC \
    && make -j"$(nproc)" \
    && make install_sw \
    && rm -rf /usr/src/openssl /tmp/openssl.tar.gz

ENV PATH="/opt/openssl-1.0.2u/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/openssl-1.0.2u/lib"

# Build Ruby 2.2.1
RUN curl -fL \
    https://cache.ruby-lang.org/pub/ruby/2.2/ruby-2.2.1.tar.gz \
    -o /tmp/ruby.tar.gz \
    && echo "5a4de38068eca8919cb087d338c0c2e3d72c9382c804fb27ab746e6c7819ab28  /tmp/ruby.tar.gz" | sha256sum -c - \
    && mkdir -p /usr/src/ruby \
    && tar -xzf /tmp/ruby.tar.gz -C /usr/src/ruby --strip-components=1 \
    && cd /usr/src/ruby \
    && autoconf \
    && ./configure \
        --disable-install-doc \
        --with-openssl-dir=/opt/openssl-1.0.2u \
    && make -j"$(nproc)" \
    && make install \
    && rm -rf /usr/src/ruby /tmp/ruby.tar.gz

# Verify Ruby and OpenSSL
RUN ruby -v && ruby -ropenssl -e 'puts OpenSSL::OPENSSL_VERSION'

# Install the exact Bundler version
RUN gem update --system 2.7.11 && \
    gem install bundler -v "${BUNDLER_VERSION}"

WORKDIR /app

# Install application dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application
COPY . .

ENV RAILS_ENV=development

EXPOSE 3000

CMD ["sh", "-c", "bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}"]
