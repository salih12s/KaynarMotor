// express/lib/router/layer iç modülünün tipi (core/asyncHata.ts Express 4 yamasında kullanılır).
declare module 'express/lib/router/layer' {
  const Layer: { prototype: { handle_request: (req: any, res: any, next: any) => void } };
  export default Layer;
}
