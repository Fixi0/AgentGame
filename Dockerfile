FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/online/package.json server/online/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-fund --no-audit && npm cache clean --force
COPY server/online ./server/online
COPY src/data/clubs.js ./src/data/clubs.js
COPY src/engine/matchEngine.js ./src/engine/matchEngine.js
COPY src/online/badgeCatalog.js ./src/online/badgeCatalog.js
COPY src/online/geography.js ./src/online/geography.js
COPY src/online/portraitCatalog.js ./src/online/portraitCatalog.js
COPY public/licenses/unicode-license.txt ./licenses/unicode-license.txt
USER node
EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT || process.env.AGENTFC_API_PORT || 4180) +'/api/online/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server/online/http.mjs"]
