#!/usr/bin/env fish
# Loads .env into the current fish shell session
# Usage (IN fish shell): source load_env.fish

set env_file (dirname (status --current-filename))/.env

for line in (grep -v '^#' $env_file | grep -v '^$')
    set parts (string split -m 1 '=' -- $line)
    set -gx $parts[1] $parts[2]
end

echo "Loaded "(count (grep -v '^#' $env_file | grep -v '^$'))" variables from .env"
