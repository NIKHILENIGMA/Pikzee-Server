# ─────────────────────────────────────────────
# 1️⃣ BASE IMAGE
# ─────────────────────────────────────────────
# Use Debian-based Node.js 20 LTS for compatibility with all native dependencies
FROM node:20-bullseye AS app

# ─────────────────────────────────────────────
# 2️⃣ SET WORKING DIRECTORY
# ─────────────────────────────────────────────
# All subsequent commands will execute from this directory inside the container
WORKDIR /app

# ─────────────────────────────────────────────
# 3️⃣ ENABLE COREPACK AND PNPM
# ─────────────────────────────────────────────
# Corepack comes with Node 20+. It manages package managers like pnpm, yarn, etc.
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─────────────────────────────────────────────
# 4️⃣ INSTALL SYSTEM BUILD TOOLS
# ─────────────────────────────────────────────
# Required by node-gyp to compile native addons like bcrypt, sharp, argon2, etc.
# We omit git because source control stays on host; we keep Python for safety.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────────────
# 5️⃣ COPY PACKAGE MANIFESTS FIRST
# ─────────────────────────────────────────────
# Copy only package.json and lockfile to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* ./

# ─────────────────────────────────────────────
# 6️⃣ INSTALL NODE DEPENDENCIES
# ─────────────────────────────────────────────
# Installs all dependencies using pnpm, including devDependencies for hot reload, linting, etc.
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────
# 7️⃣ COPY APPLICATION SOURCE CODE
# ─────────────────────────────────────────────
# Copies your server source code into the container (excluding .git via .dockerignore)
COPY . .

# ─────────────────────────────────────────────
# 8️⃣ FIX PERMISSIONS AND DROP ROOT PRIVILEGES
# ─────────────────────────────────────────────
# Change ownership of /app to 'node' user (built into Node images) for non-root execution
RUN chown -R node:node /app
USER node

# ─────────────────────────────────────────────
# 9️⃣ SET DEFAULT ENVIRONMENT VARIABLES
# ─────────────────────────────────────────────
# These act as fallbacks; docker-compose overrides them at runtime
ENV NODE_ENV=development
ENV PORT=5000

# ─────────────────────────────────────────────
# 🔟 EXPOSE APP PORT
# ─────────────────────────────────────────────
# Document the port your app listens on (for Compose / VSCode DevContainer)
EXPOSE 5000

# ─────────────────────────────────────────────
# 11️⃣ DEFAULT START COMMAND
# ─────────────────────────────────────────────
# Run the backend development server using pnpm
CMD ["pnpm", "run", "dev"]
