import dedent from "dedent";

// TODO: THis is not used anywhere, need to incrementally improve this prompt.
export const lambdaEventInputPrompt = (_function: any) => {
  return dedent`
    Key rules for Serverless Event Input processing:

    ${
      _function?.method === "GET"
        ? `- End point should not have a request body as it is a GET request`
        : `
        - do not pass in 
        `
    }
    `;
};
