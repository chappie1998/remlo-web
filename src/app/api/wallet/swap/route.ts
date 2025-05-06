import { NextRequest, NextResponse } from "next/server";
import { isValidPasscode } from "@/lib/utils";

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

/**
 * This route acts as a proxy/router to direct the request to the appropriate swap endpoint
 * based on the fromToken parameter in the request body.
 */
export async function POST(req: NextRequest) {
  try {
    // Clone the request for parsing
    const clonedReq = req.clone();
    const body = await clonedReq.json();
    
    // Extract the amount, passcode, and token from the request
    const { amount, passcode, fromToken = 'usdc', toToken = 'usds' } = body;
    
    console.log(`Received swap request: ${amount} ${fromToken.toUpperCase()} to ${toToken.toUpperCase()}`);

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Validate token parameters
    const validFromTokens = ['usdc', 'usds'];
    const validToTokens = ['usdc', 'usds'];

    if (!validFromTokens.includes(fromToken.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid fromToken. Must be one of: ${validFromTokens.join(', ')}` },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    if (!validToTokens.includes(toToken.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid toToken. Must be one of: ${validToTokens.join(', ')}` },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Ensure the tokens are different
    if (fromToken.toLowerCase() === toToken.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot swap a token to itself" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Determine which endpoint to route to based on fromToken
    let targetEndpoint;
    if (fromToken.toLowerCase() === 'usdc') {
      targetEndpoint = "/api/wallet/swap-usdc-to-usds";
      console.log("Routing to USDC to USDs swap endpoint");
    } else if (fromToken.toLowerCase() === 'usds') {
      targetEndpoint = "/api/wallet/swap-usds-to-usdc";
      console.log("Routing to USDs to USDC swap endpoint");
    } else {
      return NextResponse.json(
        { error: `Unsupported token type: ${fromToken}. Supported types: usdc, usds` },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Create a new URL for the internal API request using the origin from the original request
    const url = new URL(targetEndpoint, req.nextUrl.origin);
    
    // Create a new Request object with the same method, body, and headers
    const internalRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(body)
    });
    
    // Forward the request to the appropriate endpoint
    const response = await fetch(internalRequest);
    
    // If the response is not ok, log the error
    if (!response.ok) {
      console.error(`Error from ${targetEndpoint}:`, await response.text());
      return NextResponse.json(
        { error: `Failed to process swap for ${fromToken}` },
        {
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Return the response from the target endpoint
    const responseData = await response.json();
    
    return NextResponse.json(
      responseData,
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } catch (error) {
    console.error("Error processing swap request:", error);
    return NextResponse.json(
      { error: "Failed to process swap request" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
} 