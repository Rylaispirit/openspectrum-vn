FROM node:22-alpine

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm --filter @openspectrum-vn/api install

COPY apps/api ./apps/api
RUN pnpm --filter @openspectrum-vn/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@openspectrum-vn/api", "start"]
