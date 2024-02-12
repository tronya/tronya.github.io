#!/bin/bash

# Build Angular project
ng build --configuration production --base-href /tronya.github.io/

# Deploy to GitHub Pages
npx angular-cli-ghpages --dir=dist/tronya.github.io/