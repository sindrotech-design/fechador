declare module 'qrcode-terminal' {
  export function generate(data: string, options?: { small?: boolean }): void;
  export default generate;
}