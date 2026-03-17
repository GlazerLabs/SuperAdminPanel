import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

export async function GET() {
  try {
    const bigquery = new BigQuery({
      projectId: process.env.FIREBASE_PROJECT_ID,
      location: "asia-south1",
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });

    const query = `
      SELECT
        date,
        installs,
        uninstalls
      FROM
        playstore_reporting.install_stats
      ORDER BY
        date DESC
      LIMIT 30
    `;

    const [rows] = await bigquery.query({ query });

    return NextResponse.json(
      {
        success: true,
        data: rows,
      },
      { status: 200 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error querying BigQuery (playstore):", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

