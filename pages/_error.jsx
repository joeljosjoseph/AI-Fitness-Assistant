import * as Sentry from '@sentry/nextjs';
import Error from "next/error";

// Replace "YourCustomErrorComponent" with your custom error component!
YourCustomErrorComponent.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);

  // ...other getInitialProps code

  return Error.getInitialProps(contextData);
};