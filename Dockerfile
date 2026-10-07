FROM ruby:2.2.1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    nodejs \
    sqlite3 \
    libsqlite3-dev \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Use the same Bundler version as the original project
RUN gem install bundler -v 1.10.6

WORKDIR /app

# Install gems first for better Docker caching
COPY Gemfile Gemfile.lock ./

RUN bundle install

# Copy the application
COPY . .

# Rails environment
ENV RAILS_ENV=development

# Expose Rails
EXPOSE 3000

# Start the Rails server
CMD ["sh", "-c", "bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}"]
