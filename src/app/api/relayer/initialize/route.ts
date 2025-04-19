import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { isRelayerInitialized, initializeRelayer, getRelayerPublicKey } from "@/lib/relayer";

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    // Check if user is authenticated
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to initialize the relayer" },
        { status: 401 }
      );
    }

    // Check for admin permission - this should be properly secured in production
    // For this demo, we'll simply check if the user has an 'isAdmin' property
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to initialize the relayer" },
        { status: 403 }
      );
    }

    // Get the private key from the request body
    const { privateKey } = await req.json();

    if (!privateKey) {
      return NextResponse.json(
        { error: "Missing required field: privateKey" },
        { status: 400 }
      );
    }

    // Check if the relayer is already initialized
    if (isRelayerInitialized()) {
      return NextResponse.json(
        {
          message: "Relayer already initialized",
          publicKey: getRelayerPublicKey()
        },
        { status: 200 }
      );
    }

    // Initialize the relayer
    const success = initializeRelayer(privateKey);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to initialize relayer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Relayer initialized successfully",
      publicKey: getRelayerPublicKey(),
    });
  } catch (error) {
    console.error("Error initializing relayer:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initialize relayer";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// This GET endpoint will be used to check if the relayer is initialized
export async function GET(req: NextRequest) {
  try {
    // Check if the relayer is initialized
    const initialized = isRelayerInitialized();

    if (initialized) {
      return NextResponse.json({
        initialized,
        publicKey: getRelayerPublicKey(),
      });
    }

    return NextResponse.json({
      initialized,
      message: "Relayer not initialized",
    });
  } catch (error) {
    console.error("Error checking relayer status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check relayer status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
