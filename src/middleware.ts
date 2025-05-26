import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check if accessing admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const token = req.nextauth.token;
      
      // In development, allow any authenticated user
      if (process.env.NODE_ENV === 'development') {
        if (!token) {
          return NextResponse.redirect(new URL('/auth/signin', req.url));
        }
        return NextResponse.next();
      }
      
      // In production, check for admin email
      const adminEmails = [
        'admin@remlo.com',
        'hello.notmove@gmail.com',
        // Add more admin emails as needed
      ];
      
      if (!token || !adminEmails.includes(token.email || '')) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to admin routes if user is authenticated
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
};
