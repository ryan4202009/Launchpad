FROM debian:bookworm-slim

ENV RUBY_VERSION=2.2.1
ENV BUNDLER_VERSION=1.10.6
ENV DEBIAN_FRONTEND=noninteractive

# Build dependencies and runtime dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    bison \
    autoconf \
    ca-certificates \
    curl \
    git \
    libffi-dev \
    libgdbm-dev \
    libncurses5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
    libyaml-dev \
    nodejs \
    sqlite3 \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and build the exact Ruby version required by Launchpad
RUN curl -fL \
    https://cache.ruby-lang.org/pub/ruby/2.2/ruby-2.2.1.tar.gz \
    -o /tmp/ruby.tar.gz \
    && echo "5a4de38068eca8919cb087d338c0c2e3d72c9382c804fb27ab746e6c7819ab28  /tmp/ruby.tar.gz" | sha256sum -c - \
    && mkdir -p /usr/src/ruby \
    && tar -xzf /tmp/ruby.tar.gz -C /usr/src/ruby --strip-components=1 \
    && cd /usr/src/ruby \
    && autoconf \
    && ./configure --disable-install-doc \
    && make -j"$(nproc)" \
    && make install \
    && rm -rf /usr/src/ruby /tmp/ruby.tar.gz

# Use the exact Bundler version from the original project
RUN gem install bundler -v "${BUNDLER_VERSION}"

WORKDIR /app

# Install the application's locked dependencies
COPY Gemfile Gemfile.lock ./

RUN bundle install

# Copy Launchpad
COPY . .

ENV RAILS_ENV=development

EXPOSE 3000

CMD ["sh", "-c", "bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}"]
