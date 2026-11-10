export function GET(request){
  return Response.redirect(new URL('/dashboard/instagram',request.url),307);
}
