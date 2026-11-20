/**
 * URL of a file in public/ that works under any deploy base path
 * ('/' locally, '/yangmal-day/' on GitHub Pages). Pass the path without a leading slash: asset('images/room.png').
 */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
