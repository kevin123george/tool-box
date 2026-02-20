#!/usr/bin/env fish
# Loads .env into the current fish shell session
# Usage: source load_env.fish

for line in (grep -v '^#' (dirname (status --current-filename))/.env | grep -v '^$')
    set -x (string split -m 1 '=' $line)[1] (string split -m 1 '=' $line)[2]
end
