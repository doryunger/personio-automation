describe("Fill Empty Timecards", () => {
  it("should fill empty timecards with random start times and calculated end times", () => {
    const logStep = (message) => {
      cy.log(message);
      cy.task("logToFile", message, { log: false });
    };

    cy.task("clearLogFile", null, { log: false });
    cy.task("getEnvVars").then(({ companyDomain, username, password, employeeId, previousMonth }) => {

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
          cy.task("logToFile", message, { log: false });
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

        const getTimeOffItems = (timecard) => {
          return timecard.time_off?.items || [];
        };

        const getTimeOffLabel = (item) => {
          return String(item.name || item.type || item.category || "").toLowerCase();
        };

        // Home Office is "productive" time off in Personio — you still work and
        // must track hours. It appears under time_off but must not be treated
        // like vacation/sickness.
        const isHomeOfficeItem = (item) => {
          if (item.is_offsite_work_absence === true) {
            return true;
          }
          const label = getTimeOffLabel(item);
          const category = String(item.category || "").toLowerCase();
          return (
            category === "offsite_work" ||
            label.includes("home office") ||
            label.includes("homeoffice") ||
            label.includes("home-office") ||
            label.includes("remote work") ||
            label.includes("remote working") ||
            label.includes("arbeit von zuhause") ||
            label.includes("mobile arbeit")
          );
        };

        // Real absences only (exclude productive time off like Home Office).
        const getAbsenceTimeOffItems = (timecard) => {
          return getTimeOffItems(timecard).filter((item) => !isHomeOfficeItem(item));
        };

        // Krankheit/sickness is a day off by default — only fill hours when
        // Personio gives an explicit partial duration (< full day).
        const isKrankheitItem = (item) => {
          const label = getTimeOffLabel(item);
          return (
            label.includes("krankheit") ||
            label.includes("sick") ||
            label.includes("sickness") ||
            label.includes("illness")
          );
        };

        const isFullDayDuration = (durationMinutes) => {
          return (
            durationMinutes === null ||
            durationMinutes === undefined ||
            durationMinutes === 480
          );
        };

        const isPartialDuration = (durationMinutes) => {
          return (
            typeof durationMinutes === "number" &&
            durationMinutes > 0 &&
            durationMinutes < 480
          );
        };

        const hasKrankheitWithoutPartialHours = (timecard) => {
          const items = getAbsenceTimeOffItems(timecard);
          const krankheitItems = items.filter(isKrankheitItem);
          if (krankheitItems.length === 0) {
            return false;
          }

          // If any Krankheit entry has an explicit partial duration, Personio
          // still expects remaining work hours for that day.
          const hasExplicitPartial = krankheitItems.some((item) =>
            isPartialDuration(item.duration_minutes),
          );
          if (hasExplicitPartial) {
            return false;
          }

          return true;
        };

        const hasFullDayTimeOff = (timecard) => {
          const items = getAbsenceTimeOffItems(timecard);
          if (items.length === 0) {
            return false;
          }

          // Only trust the aggregate when no Home Office items are mixed in;
          // otherwise Home Office can inflate the total and look like vacation.
          const hasHomeOffice = getTimeOffItems(timecard).some(isHomeOfficeItem);
          if (
            !hasHomeOffice &&
            timecard.time_off.aggregated_duration_minutes === 480
          ) {
            return true;
          }

          return items.some((item) => isFullDayDuration(item.duration_minutes));
        };

        const getTimeOffDuration = (timecard) => {
          const items = getAbsenceTimeOffItems(timecard);
          if (items.length === 0) {
            return 0;
          }

          const hasHomeOffice = getTimeOffItems(timecard).some(isHomeOfficeItem);
          if (
            !hasHomeOffice &&
            timecard.time_off.aggregated_duration_minutes !== null &&
            timecard.time_off.aggregated_duration_minutes !== undefined
          ) {
            return timecard.time_off.aggregated_duration_minutes;
          }

          const totalDuration = items.reduce((sum, item) => {
            // null/undefined duration means full-day absence (8h)
            const duration = isFullDayDuration(item.duration_minutes)
              ? 480
              : item.duration_minutes;
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

          // Krankheit without an explicit partial duration → treat like a day off
          if (hasKrankheitWithoutPartialHours(timecard)) {
            return true;
          }

          if (hasFullDayTimeOff(timecard)) {
            return true;
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

        const isDeprecatedCsrf = (value) => {
          return (
            !value ||
            value.includes("deprecated") ||
            value.startsWith("00000000-0000-0000-0000-000000000000")
          );
        };

        const pickCsrfFromCookies = (cookies) => {
          const preferredNames = [
            "ATHENA-XSRF-TOKEN",
            "XSRF-TOKEN",
            "CSRF-TOKEN",
            "_csrf",
          ];
          const byName = Object.fromEntries(
            cookies.map((c) => [c.name, c.value]),
          );

          logStep(
            `Cookies present: ${cookies
              .map((c) => `${c.name}=${String(c.value).substring(0, 40)}`)
              .join(" | ")}`,
          );

          for (const name of preferredNames) {
            const value = byName[name];
            if (value && !isDeprecatedCsrf(value)) {
              return { name, value };
            }
          }

          // Fall back to ATHENA even if deprecated so we can log it
          if (byName["ATHENA-XSRF-TOKEN"]) {
            return {
              name: "ATHENA-XSRF-TOKEN",
              value: byName["ATHENA-XSRF-TOKEN"],
            };
          }
          return null;
        };

        const extractCsrfFromSetCookie = (headers) => {
          if (!headers["set-cookie"]) {
            return null;
          }
          const setCookieHeader = Array.isArray(headers["set-cookie"])
            ? headers["set-cookie"]
            : [headers["set-cookie"]];
          for (const cookie of setCookieHeader) {
            const match = cookie.match(
              /(?:ATHENA-XSRF-TOKEN|XSRF-TOKEN)=([^;]+)/i,
            );
            if (match && !isDeprecatedCsrf(match[1])) {
              return match[1];
            }
          }
          return null;
        };

        const buildApiHeaders = (csrfToken) => {
          const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          };
          if (csrfToken && !isDeprecatedCsrf(csrfToken)) {
            headers["X-CSRF-Token"] = csrfToken;
            headers["X-ATHENA-XSRF-TOKEN"] = csrfToken;
            headers["X-XSRF-TOKEN"] = csrfToken;
          }
          return headers;
        };

        // Warm up the attendance UI so Personio issues a real CSRF cookie
        // (ATHENA-XSRF-TOKEN is currently a deprecated placeholder after login).
        const attendanceUrl = `https://alpine-eagle-gmbh.app.personio.com/attendance/employee/${employeeId}/${startDate}`;
        logStep(`Visiting attendance page to refresh CSRF: ${attendanceUrl}`);
        cy.visit(attendanceUrl, { failOnStatusCode: false });
        cy.wait(3000);

        cy.window().then((win) => {
          try {
            const meta = win.document.querySelector(
              'meta[name="csrf-token"], meta[name="xsrf-token"]',
            );
            if (meta?.content) {
              logStep(
                `Found CSRF meta tag: ${meta.content.substring(0, 50)}...`,
              );
            }
            const lsKeys = Object.keys(win.localStorage || {});
            const ssKeys = Object.keys(win.sessionStorage || {});
            logStep(
              `Storage keys — localStorage: [${lsKeys.join(", ")}] sessionStorage: [${ssKeys.join(", ")}]`,
            );
          } catch (e) {
            logStep(`Could not inspect page storage: ${e.message}`);
          }
        });

        logStep(
          `Starting to process empty timecards for period: ${startDate} to ${endDate}...`,
        );

        cy.getCookies().then((cookies) => {
          let csrfToken = null;
          const picked = pickCsrfFromCookies(cookies);
          if (picked) {
            csrfToken = picked.value;
            logStep(
              `Found CSRF token from ${picked.name}: ${csrfToken.substring(0, 50)}...`,
            );
            if (isDeprecatedCsrf(csrfToken)) {
              logStep(
                "⚠️ CSRF token is a deprecated placeholder — PUT writes will likely fail until a real token is obtained",
              );
            }
          } else {
            logStep(
              "⚠️ CSRF token not found in cookies, will try to get from API response",
            );
          }

          logStep(
            `Fetching timesheet for period: ${startDate} to ${endDate}`,
          );

          cy.request({
            method: "GET",
            url: `https://alpine-eagle-gmbh.app.personio.com/svc/attendance-bff/v1/timesheet/${employeeId}?start_date=${startDate}&end_date=${endDate}&timezone=Europe%2FBerlin`,
            headers: buildApiHeaders(csrfToken),
            failOnStatusCode: false,
          }).then((response) => {
            const refreshed = extractCsrfFromSetCookie(response.headers);
            if (refreshed) {
              csrfToken = refreshed;
              logStep(
                `Extracted fresh CSRF token from response: ${csrfToken.substring(0, 50)}...`,
              );
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
                  throw new Error("No timecards in timesheet response");
                }

                logStep(
                  `Total timecards in response: ${timesheetData.timecards.length}`,
                );
                if (timesheetData.owner_has_propose_rights === false) {
                  logStep(
                    "⚠️ owner_has_propose_rights=false — Personio may reject updates (period locked/closed or missing edit rights)",
                  );
                }
              } catch (error) {
                logStep(`❌ JSON parsing error: ${error.message}`);
                logStep(
                  `❌ Response body: ${JSON.stringify(response.body, null, 2)}`,
                );
                throw error;
              }

              const emptyTimecards = timesheetData.timecards.filter(
                (timecard) => {
                  const isEmpty = isEmptyTimecard(timecard);
                  const shouldSkip = shouldSkipTimecard(timecard);

                  if (isEmpty && !shouldSkip) {
                    const homeOfficeItems = getTimeOffItems(timecard).filter(
                      isHomeOfficeItem,
                    );
                    const timeOffDuration = getTimeOffDuration(timecard);
                    if (homeOfficeItems.length > 0) {
                      const homeOfficeTypes = homeOfficeItems.map(
                        (item) => item.name || item.type,
                      );
                      logStep(
                        `✅ Will process empty timecard for date: ${timecard.date} (Home Office: ${homeOfficeTypes.join(", ")} — still filling work hours)`,
                      );
                    } else if (timeOffDuration > 0 && timeOffDuration < 480) {
                      const timeOffTypes = getAbsenceTimeOffItems(timecard).map(
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
                    if (hasKrankheitWithoutPartialHours(timecard)) {
                      const timeOffTypes = getAbsenceTimeOffItems(timecard)
                        .filter(isKrankheitItem)
                        .map((item) => item.name || item.type);
                      skipReasons.push(
                        `Krankheit/sickness (${timeOffTypes.join(", ")}) — no hours`,
                      );
                    } else if (hasFullDayTimeOff(timecard)) {
                      const timeOffTypes = getAbsenceTimeOffItems(timecard).map(
                        (item) => item.name || item.type,
                      );
                      skipReasons.push(
                        `full day time off (${timeOffTypes.join(", ")})`,
                      );
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

              if (emptyTimecards.length === 0) {
                logStep("No empty timecards found to fill");
                return;
              }

              // Personio replaced PUT /days/:day_id (now 501) with bulk
              // createBulkAttendanceDays: PUT /svc/attendance-api/v1/days
              // Body uses dates[] + HH:mm period times (not full ISO datetimes).
              const writeUrl =
                "https://alpine-eagle-gmbh.app.personio.com/svc/attendance-api/v1/days";

              const buildBulkPayload = (timecard, startTime, endTime) => {
                return {
                  dates: [timecard.date],
                  employee_id: Number(employeeId) || employeeId,
                  periods: [
                    {
                      start: startTime,
                      start_day_delta: 0,
                      end: endTime,
                      end_day_delta: 0,
                      type: "work",
                      comment: null,
                      project_id: null,
                    },
                  ],
                };
              };

              let successCount = 0;
              let failCount = 0;

              const processNext = (i) => {
                if (i >= emptyTimecards.length) {
                  logStep(
                    `Finished updates: ${successCount} succeeded, ${failCount} failed (of ${emptyTimecards.length})`,
                  );
                  if (failCount > 0 || successCount === 0) {
                    throw new Error(
                      `Timecard updates incomplete: ${successCount} ok, ${failCount} failed`,
                    );
                  }
                  return;
                }

                const timecard = emptyTimecards[i];
                logStep(
                  `Processing timecard ${i + 1}/${emptyTimecards.length} for date: ${timecard.date}`,
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

                const createPayload = buildBulkPayload(
                  timecard,
                  startTime,
                  endTime,
                );

                logStep(
                  `Create payload for ${timecard.date}: ${JSON.stringify(createPayload, null, 2)}`,
                );

                cy.request({
                  method: "PUT",
                  url: writeUrl,
                  headers: buildApiHeaders(csrfToken),
                  body: createPayload,
                  failOnStatusCode: false,
                }).then((writeResponse) => {
                  logStep(
                    `PUT API response status for ${timecard.date}: ${writeResponse.status}`,
                  );
                  logStep(
                    `PUT response body: ${JSON.stringify(writeResponse.body, null, 2)}`,
                  );

                  if (
                    writeResponse.status === 200 ||
                    writeResponse.status === 201
                  ) {
                    successCount += 1;
                    logStep(
                      `✅ Successfully updated timecard for ${timecard.date}`,
                    );
                  } else {
                    failCount += 1;
                    logStep(
                      `❌ Failed to update timecard for ${timecard.date} with status: ${writeResponse.status}`,
                    );
                    logStep(
                      `Error details: ${JSON.stringify(writeResponse.body, null, 2)}`,
                    );
                    if (
                      writeResponse.status === 403 ||
                      writeResponse.status === 409 ||
                      writeResponse.status === 422
                    ) {
                      logStep(
                        `⚠️ Likely cause for ${timecard.date}: attendance period locked/closed, day already approved, or missing edit rights`,
                      );
                    }
                  }
                  processNext(i + 1);
                });
              };

              processNext(0);
            } else {
              logStep(
                `❌ Failed to fetch timesheet data: ${response.status}`,
              );
              throw new Error(
                `Failed to fetch timesheet data: ${response.status}`,
              );
            }
          });
        });
      },
    );
    }); // cy.task getEnvVars
  });
});
