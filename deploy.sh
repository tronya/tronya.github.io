#!/bin/bash

# Build Angular project
ng build --prod --base-href /tronya.github.io/

# Deploy to GitHub Pages
npx angular-cli-ghpages --dir=dist/tronya.github.io/