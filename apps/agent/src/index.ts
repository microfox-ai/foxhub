import dotenv from 'dotenv';

export const handler = async (event: any): Promise<any> => {
  try {
    console.log("event", event);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello, world!", requestEvent: event }),
    };
  } catch (generalError) {
    console.error("Unexpected error in handler:", generalError);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        details: generalError instanceof Error ? generalError.message : String(generalError),
      }),
    };
  }
};
