import { timingSafeEqual } from 'node:crypto';

export function isAdminRequest(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  const supplied = request.headers.get('authorization');
  if (!configuredKey || !supplied?.startsWith('Bearer ')) return false;

  const suppliedKey = supplied.slice('Bearer '.length);
  const configuredBuffer = Buffer.from(configuredKey);
  const suppliedBuffer = Buffer.from(suppliedKey);
  return (
    configuredBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(configuredBuffer, suppliedBuffer)
  );
}
