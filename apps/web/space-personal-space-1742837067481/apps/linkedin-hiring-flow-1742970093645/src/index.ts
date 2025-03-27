// Re-export external API functions
export { fetchLinkedInApplicants } from "./functions/fetchLinkedInApplicants";
export { sendAutomatedEmail } from "./functions/sendAutomatedEmail";
export { updateApplicantStatus } from "./functions/updateApplicantStatus";
export { getApplicants } from "./functions/getApplicants";
export { exportToExcel } from "./functions/exportToExcel";

// Re-export cron functions
export { fetchApplicantsJob } from "./functions/fetchApplicantsJob";
export { sendDailyEmails } from "./functions/sendDailyEmails";

// Import docs from each function
import { fetchLinkedInApplicantsDocs } from "./functions/fetchLinkedInApplicants";
import { sendAutomatedEmailDocs } from "./functions/sendAutomatedEmail";
import { updateApplicantStatusDocs } from "./functions/updateApplicantStatus";
import { getApplicantsDocs } from "./functions/getApplicants";
import { exportToExcelDocs } from "./functions/exportToExcel";
import { fetchApplicantsJobDocs } from "./functions/fetchApplicantsJob";
import { sendDailyEmailsDocs } from "./functions/sendDailyEmails";

/**
 * Complete API documentation
 */
const apiDocs = {
  title: "Applicant Tracking System API",
  description: "Complete documentation for the Applicant Tracking System lambda functions",
  version: "1.0.0",
  sections: {
    applicants: {
      title: "Applicant Management",
      description: "Endpoints for managing applicants and their data",
      endpoints: {
        fetchLinkedInApplicants: fetchLinkedInApplicantsDocs,
        getApplicants: getApplicantsDocs,
        updateApplicantStatus: updateApplicantStatusDocs,
      },
    },
    communication: {
      title: "Communication",
      description: "Endpoints for sending emails and managing communication",
      endpoints: {
        sendAutomatedEmail: sendAutomatedEmailDocs,
      },
    },
    reporting: {
      title: "Reporting",
      description: "Endpoints for generating reports",
      endpoints: {
        exportToExcel: exportToExcelDocs,
      },
    },
    cron: {
      title: "Scheduled Jobs",
      description: "Automated scheduled tasks and cron jobs",
      endpoints: {
        fetchApplicantsJob: fetchApplicantsJobDocs,
        sendDailyEmails: sendDailyEmailsDocs,
      },
    },
  },
};

/**
 * GET endpoint to serve API documentation
 * This Lambda function returns the complete API documentation in JSON format
 */
export const getDocs = async (event: any) => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(apiDocs, null, 2),
    };
  } catch (error) {
    console.error("Error serving docs:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};