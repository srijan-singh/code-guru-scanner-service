# Add scripts to package.json
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.dev="ts-node src/index.ts"

# Build the TypeScript
npm run build

# Run the language server client
npm run start

# Or run directly with ts-node
npm run dev