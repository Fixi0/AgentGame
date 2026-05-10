export const assetPath = (relativePath = '') => `${import.meta.env.BASE_URL}${String(relativePath).replace(/^\/+/, '')}`;

