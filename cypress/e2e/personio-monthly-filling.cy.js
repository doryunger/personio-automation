describe("Fill Empty Timecards", () => {
  it("should fill empty timecards with random start times and calculated end times", () => {
    const logStep = (message) => {
      cy.log(message);
    };

    const companyDomain = Cypress.env("PERSONIO_COMPANY_DOMAIN") || "";
    const username = Cypress.env("PERSONIO_USERNAME") || "";
    const password = Cypress.env("PERSONIO_PASSWORD") || "";
    const employeeId = Cypress.env("PERSONIO_EMPLOYEE_ID") || "";
    const previousMonth = Cypress.env("PREVIOUS_MONTH") === "true";

    logStep("Starting fill empty timecards test");
    logStep(`Previous month mode: ${previousMonth}`);

    if (!companyDomain || !username || !password || !employeeId) {
      const missingVars = [];
      if (!companyDomain) missingVars.push("PERSONIO_COMPANY_DOMAIN");
      if (!username) missingVars.push("PERSONIO_USERNAME");
      if (!password) missingVars.push("PERSONIO_PASSWORD");
      if (!employeeId) missingVars.push("PERSONIO_EMPLOYEE_ID");

      logStep(
        `❌ ERROR: Missing required environment variables: ${missingVars.join(", ")}`,
      );
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`,
      );
    }

    const currentDate = new Date();
    let targetDate;

    if (previousMonth) {
      targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      );
      logStep("Targeting previous month for timecard filling");
    } else {
      targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      logStep("Targeting current month for timecard filling");
    }

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const startDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-01`;

    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

    logStep(`Target period: ${startDate} to ${endDate}`);

    const companyLoginUrl = `https://${companyDomain}.app.personio.com/login`;
    logStep(`Attempting direct login to: ${companyLoginUrl}`);

    cy.visit(companyLoginUrl);
    logStep("Visited company-specific login page");

    cy.get("body").should("be.visible");
    cy.wait(3000);

    cy.url().then((url) => {
      logStep(`Current URL after visit: ${url}`);

      if (url.includes("login.personio.com")) {
        logStep("Redirected to main login page, trying original approach");

        cy.window().then((win) => {
          delete win.navigator.webdriver;
          Object.defineProperty(win.navigator, "webdriver", {
            get: () => undefined,
          });
          if (win.chrome && win.chrome.runtime) {
            delete win.chrome.runtime.onConnect;
            delete win.chrome.runtime.onMessage;
          }
        });

        cy.get("body").then(($body) => {
          if (
            $body.find(
              'button:contains("Alles akzeptieren"), button:contains("Accept All")',
            ).length > 0
          ) {
            logStep("Cookie consent dialog detected, clicking Accept All");
            cy.get(
              'button:contains("Alles akzeptieren"), button:contains("Accept All")',
            )
              .first()
              .click();
            cy.wait(2000);
          }
        });

        cy.get("body").then(($body) => {
          logStep("Looking for input elements on login page...");
          cy.get("input").then(($inputs) => {
            logStep(`Found ${$inputs.length} input elements`);
            $inputs.each((i, input) => {
              logStep(
                `Input ${i}: type="${input.type}", name="${input.name}", placeholder="${input.placeholder}", id="${input.id}"`,
              );
            });
          });
        });

        cy.get('input[name="username"], input[id="username"]', {
          timeout: 15000,
        }).should("be.visible");

        cy.get('input[name="username"], input[id="username"]')
          .first()
          .clear({ force: true })
          .type(username, { force: true });
        logStep(`Filled email/username: ${username}`);

        cy.get(
          'button:contains("Continue"), button:contains("Weiter"), button[type="submit"]',
        )
          .should("be.visible")
          .first()
          .click({ force: true });
        logStep("Clicked Continue button");
      } else {
        logStep("Successfully on company login page, proceeding with login");

        cy.get('input[name="username"], input[id="username"]', {
          timeout: 15000,
        }).should("be.visible");

        cy.get('input[name="username"], input[id="username"]')
          .first()
          .clear({ force: true })
          .type(username, { force: true });
        logStep(`Filled email/username: ${username}`);

        cy.get(
          'button:contains("Continue"), button:contains("Weiter"), button[type="submit"]',
        )
          .should("be.visible")
          .first()
          .click({ force: true });
        logStep("Clicked Continue button");
      }
    });

    cy.wait(3000);

    cy.get('input[type="password"]', { timeout: 15000 }).should("be.visible");

    logStep(`About to fill password field with: ${password}`);
    cy.get('input[type="password"]')
      .first()
      .clear({ force: true })
      .type(password, { force: true });
    logStep("Filled password");

    cy.get(
      'button[type="submit"], button:contains("Sign in"), button:contains("Login"), button:contains("Einloggen")',
    )
      .should("be.visible")
      .first()
      .click({ force: true });
    logStep("Submitted login credentials");

    cy.wait(5000);
    logStep("Navigated to company app domain");

    cy.origin(
      "https://alpine-eagle-gmbh.app.personio.com",
      { args: { employeeId, startDate, endDate, previousMonth, targetDate } },
      ({ employeeId, startDate, endDate, previousMonth, targetDate }) => {
        const logStep = (message) => {
          cy.log(message);
        };

        cy.wait(5000);
        logStep("Navigated to company app domain");

        cy.url().should("include", "alpine-eagle-gmbh.app.personio.com");
        logStep("Successfully logged in to company domain");

        cy.wait(3000);

        const generateRandomStartTime = () => {
          const startHour = 7;
          const startMinute = 45;
          const endHour = 9;
          const endMinute = 5;

          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;

          const randomMinutes =
            Math.floor(Math.random() * (endMinutes - startMinutes + 1)) +
            startMinutes;
          const hours = Math.floor(randomMinutes / 60);
          const minutes = randomMinutes % 60;

          return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        };

        const generateUUID = () => {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            },
          );
        };

        const getTimeOffDuration = (timecard) => {
          if (
            !timecard.time_off ||
            !timecard.time_off.items ||
            timecard.time_off.items.length === 0
          ) {
            return 0;
          }

          if (
            timecard.time_off.aggregated_duration_minutes !== null &&
            timecard.time_off.aggregated_duration_minutes !== undefined
          ) {
            return timecard.time_off.aggregated_duration_minutes;
          }

          const totalDuration = timecard.time_off.items.reduce((sum, item) => {
            const duration =
              item.duration_minutes === null ? 480 : item.duration_minutes;
            return sum + (duration || 0);
          }, 0);

          return totalDuration;
        };

        const calculateEndTime = (
          startTime,
          targetWorkDurationMinutes = null,
        ) => {
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const startTotalMinutes = startHour * 60 + startMinute;

          let workDuration;
          if (targetWorkDurationMinutes !== null) {
            workDuration = targetWorkDurationMinutes;
          } else {
            const minDuration = 8.5 * 60;
            const maxDuration = 9.5 * 60;
            workDuration =
              Math.floor(Math.random() * (maxDuration - minDuration + 1)) +
              minDuration;
          }

          const endTotalMinutes = startTotalMinutes + workDuration;
          const endHours = Math.floor(endTotalMinutes / 60);
          const endMinutes = endTotalMinutes % 60;

          return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
        };

        const isEmptyTimecard = (timecard) => {
          return !timecard.periods || timecard.periods.length === 0;
        };

        const shouldSkipTimecard = (timecard) => {
          if (timecard.is_off_day) {
            return true;
          }

          const timeOffDuration = getTimeOffDuration(timecard);
          if (timeOffDuration > 0) {
            const timeOffItems = timecard.time_off.items;
            const hasFullDayOff = timeOffItems.some(
              (item) =>
                item.duration_minutes === null || item.duration_minutes === 480,
            );
            if (
              hasFullDayOff ||
              timecard.time_off.aggregated_duration_minutes === 480
            ) {
              return true;
            }
          }

          if (previousMonth) {
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth() + 1;
            const targetStartDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-01`;
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            const targetEndDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

            if (
              timecard.date < targetStartDate ||
              timecard.date > targetEndDate
            ) {
              return true;
            }
          } else {
            const today = new Date().toISOString().split("T")[0];
            if (timecard.date > today) {
              return true;
            }
          }

          return false;
        };

        logStep(
          `Starting to process empty timecards for period: ${startDate} to ${endDate}...`,
        );

        cy.getCookies().then((cookies) => {
          let csrfToken = null;
          const csrfCookie = cookies.find(
            (c) => c.name === "ATHENA-XSRF-TOKEN",
          );
          if (csrfCookie) {
            csrfToken = csrfCookie.value;
            logStep(
              `Found CSRF token in cookie: ${csrfToken.substring(0, 50)}...`,
            );
          } else {
            logStep(
              "⚠️ CSRF token not found in cookies, will try to get from API response",
            );
          }

          logStep(
            `Fetching timesheet for period: ${startDate} to ${endDate}`,
          );

          const headers = {
            "X-Requested-With": "XMLHttpRequest",
          };
          if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
            headers["X-ATHENA-XSRF-TOKEN"] = csrfToken;
          }

          cy.request({
            method: "GET",
            url: `https://alpine-eagle-gmbh.app.personio.com/svc/attendance-bff/v1/timesheet/${employeeId}?start_date=${startDate}&end_date=${endDate}&timezone=Europe%2FBerlin`,
            headers: headers,
            failOnStatusCode: false,
          }).then((response) => {
            if (!csrfToken && response.headers["set-cookie"]) {
              const setCookieHeader = Array.isArray(
                response.headers["set-cookie"],
              )
                ? response.headers["set-cookie"]
                : [response.headers["set-cookie"]];
              const xsrfCookie = setCookieHeader.find((c) =>
                c.includes("ATHENA-XSRF-TOKEN"),
              );
              if (xsrfCookie) {
                const match = xsrfCookie.match(/ATHENA-XSRF-TOKEN=([^;]+)/);
                if (match) {
                  csrfToken = match[1];
                  logStep(
                    `Extracted CSRF token from response: ${csrfToken.substring(0, 50)}...`,
                  );
                }
              }
            }
            logStep(`Timesheet API response status: ${response.status}`);
            logStep(
              `Response headers: ${JSON.stringify(response.headers, null, 2)}`,
            );
            logStep(`Response body type: ${typeof response.body}`);
            logStep(
              `Response body length: ${response.body ? response.body.length : "null"}`,
            );

            if (response.status === 200 && response.body) {
              let timesheetData;

              try {
                timesheetData =
                  typeof response.body === "string"
                    ? JSON.parse(response.body)
                    : response.body;
                logStep("✅ Successfully fetched timesheet data");
                logStep(`Response body keys: ${Object.keys(timesheetData)}`);

                if (!timesheetData.timecards) {
                  logStep(
                    `❌ No timecards property found in response. Available keys: ${Object.keys(timesheetData)}`,
                  );
                  return;
                }

                logStep(
                  `Total timecards in response: ${timesheetData.timecards.length}`,
                );
              } catch (error) {
                logStep(`❌ JSON parsing error: ${error.message}`);
                logStep(
                  `❌ Response body: ${JSON.stringify(response.body, null, 2)}`,
                );
                return;
              }

              const emptyTimecards = timesheetData.timecards.filter(
                (timecard) => {
                  const isEmpty = isEmptyTimecard(timecard);
                  const shouldSkip = shouldSkipTimecard(timecard);

                  if (isEmpty && !shouldSkip) {
                    const timeOffDuration = getTimeOffDuration(timecard);
                    if (timeOffDuration > 0 && timeOffDuration < 480) {
                      const timeOffTypes = timecard.time_off.items.map(
                        (item) => item.name || item.type,
                      );
                      logStep(
                        `✅ Will process empty timecard for date: ${timecard.date} (partial time off: ${timeOffTypes.join(", ")}, ${timeOffDuration} min)`,
                      );
                    } else {
                      logStep(
                        `✅ Will process empty timecard for date: ${timecard.date}`,
                      );
                    }
                  } else if (isEmpty && shouldSkip) {
                    const skipReasons = [];
                    if (timecard.is_off_day) skipReasons.push("off day");
                    const timeOffDuration = getTimeOffDuration(timecard);
                    if (timeOffDuration > 0) {
                      const timeOffItems = timecard.time_off.items;
                      const hasFullDayOff = timeOffItems.some(
                        (item) =>
                          item.duration_minutes === null ||
                          item.duration_minutes === 480,
                      );
                      if (
                        hasFullDayOff ||
                        timecard.time_off.aggregated_duration_minutes === 480
                      ) {
                        const timeOffTypes = timecard.time_off.items.map(
                          (item) => item.name || item.type,
                        );
                        skipReasons.push(
                          `full day time off (${timeOffTypes.join(", ")})`,
                        );
                      }
                    }
                    if (previousMonth) {
                      const targetYear = targetDate.getFullYear();
                      const targetMonth = targetDate.getMonth() + 1;
                      const targetStartDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-01`;
                      const lastDay = new Date(
                        targetYear,
                        targetMonth,
                        0,
                      ).getDate();
                      const targetEndDate = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
                      if (
                        timecard.date < targetStartDate ||
                        timecard.date > targetEndDate
                      ) {
                        skipReasons.push("outside target range");
                      }
                    } else {
                      const today = new Date().toISOString().split("T")[0];
                      if (timecard.date > today) {
                        skipReasons.push("future date");
                      }
                    }
                    logStep(
                      `⏭️ Skipping empty timecard for date: ${timecard.date} (${skipReasons.join(", ")})`,
                    );
                  } else if (!isEmpty) {
                    logStep(
                      `📝 Timecard for date: ${timecard.date} already has periods, skipping`,
                    );
                  }

                  return isEmpty && !shouldSkip;
                },
              );

              logStep(
                `Found ${emptyTimecards.length} empty timecards to fill`,
              );
              logStep(
                `Using CSRF token for PUT requests: ${csrfToken ? csrfToken.substring(0, 50) + "..." : "NOT FOUND"}`,
              );

              if (emptyTimecards.length > 0) {
                emptyTimecards.forEach((timecard, index) => {
                  logStep(
                    `Processing timecard ${index + 1}/${emptyTimecards.length} for date: ${timecard.date}`,
                  );

                  const timeOffDuration = getTimeOffDuration(timecard);
                  let targetWorkDuration = null;

                  if (timeOffDuration > 0 && timeOffDuration < 480) {
                    targetWorkDuration = 480 - timeOffDuration;
                    logStep(
                      `⚠️ Partial time off detected: ${timeOffDuration} minutes off, adjusting work duration to ${targetWorkDuration} minutes (${(targetWorkDuration / 60).toFixed(1)} hours)`,
                    );
                  }

                  const startTime = generateRandomStartTime();
                  const endTime = calculateEndTime(
                    startTime,
                    targetWorkDuration,
                  );

                  logStep(
                    `Generated start time: ${startTime}, end time: ${endTime}${targetWorkDuration ? ` (adjusted for partial time off)` : ""}`,
                  );

                  const newPeriod = {
                    id: generateUUID(),
                    comment: null,
                    period_type: "work",
                    project_id: null,
                    start: `${timecard.date}T${startTime}:00`,
                    end: `${timecard.date}T${endTime}:00`,
                    auto_generated: false,
                  };

                  const createPayload = {
                    employee_id: employeeId,
                    periods: [newPeriod],
                    original_periods: null,
                    geolocation: null,
                    is_from_clock_out: false,
                  };

                  logStep(
                    `Create payload for ${timecard.date}: ${JSON.stringify(createPayload, null, 2)}`,
                  );

                  const dayId = timecard.day_id || generateUUID();
                  const apiUrl = `https://alpine-eagle-gmbh.app.personio.com/svc/attendance-api/v1/days/${dayId}`;
                  const method = "PUT";

                  const putHeaders = {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                  };
                  if (csrfToken) {
                    putHeaders["X-CSRF-Token"] = csrfToken;
                    putHeaders["X-ATHENA-XSRF-TOKEN"] = csrfToken;
                  }

                  cy.request({
                    method: method,
                    url: apiUrl,
                    headers: putHeaders,
                    body: createPayload,
                    failOnStatusCode: false,
                  }).then((response) => {
                    logStep(
                      `PUT API response status for ${timecard.date}: ${response.status}`,
                    );
                    logStep(
                      `PUT response body: ${JSON.stringify(response.body, null, 2)}`,
                    );

                    if (response.status === 200 || response.status === 201) {
                      logStep(
                        `✅ Successfully updated timecard for ${timecard.date} with day_id: ${dayId}`,
                      );
                    } else {
                      logStep(
                        `❌ Failed to update timecard for ${timecard.date} with status: ${response.status}`,
                      );
                      logStep(
                        `Error details: ${JSON.stringify(response.body, null, 2)}`,
                      );
                    }
                  });
                });
              } else {
                logStep("No empty timecards found to fill");
              }
            } else {
              logStep(
                `❌ Failed to fetch timesheet data: ${response.status}`,
              );
            }
          });
        });
      },
    );
  });
});
