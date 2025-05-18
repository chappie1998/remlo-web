import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get token from request header
    const cookieStore = await cookies();

    // Adjust for HTTPS/production if needed
    const sessionToken = cookieStore.get("next-auth.session-token")?.value ?? cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (sessionToken) {
      // Delete the session
      await prisma.session
        .delete({
          where: {
            sessionToken,
          },
        })
        .catch(() => {
          // Ignore errors if session doesn't exist
        });
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  } catch (error) {
    console.error("Error during signout:", error);
    return NextResponse.json(
      { success: true }, // Return success anyway as the client will clear local storage
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  }
}
