async function pageFunction(context) {
    const { page, request, log, input } = context;

    const latitude = -3.443239;
    const longitude = 114.723071;
    const API_KEY = '0a363ca8af810cdf2b0477abfeb70039';
    const captchaSelector = 'img#kv-image';
    const captchaInputSelector = '#kv-captcha';
    const refreshButtonSelector = '.btn-sm';
    const loginButtonSelector = '.d-grid';

    // Allow site to access geolocation
    await page.browserContext().overridePermissions(request.url, ['geolocation']);

    // Spoof location to Kanim Banjarmasin
    await page.setGeolocation({ latitude, longitude });

    log.info(`📍 Spoofed location set to: Latitude ${latitude}, Longitude ${longitude}`);

    const results = [];

    for (const userData of input.qs_data) {
        log.info(`🔁 Processing user: ${userData.username}`);
        
        const result = await processSingleUser(page, request, log, userData);
        results.push({ username: userData.username, result });
    }

    async function processSingleUser(page, request, log, userData) {
    
    await page.goto(request.url, { waitUntil: 'networkidle0' });

   // Step 1: Fill user and password
    const inputSelector = '.form-control';
    const inputFields = await page.$$(inputSelector);

    if (inputFields.length >= 2) {
        await inputFields[0].type(userData.nip);
        await inputFields[1].type(userData.password);
        log.info('🧑‍💻 Filled in 👤 *Username* and 🔒 *Password* successfully!');
    } else {
        throw new Error(`❌ Input fields not found: ${inputSelector}`);
    }

    let solutionText = null;
    let attempt = 0;
    const maxAttempts = 3;

    // Enhanced captcha solving with retry logic
    while (attempt < maxAttempts) {
        attempt++;
        log.info(`🔁 [Attempt ${attempt}/${maxAttempts}] Starting captcha solve process...`);

        await page.waitForSelector(captchaSelector, { visible: true, timeout: 10000 });
        await page.waitForFunction((sel) => {
            const img = document.querySelector(sel);
            return img && img.complete && img.naturalWidth > 0;
        }, { timeout: 10000 }, captchaSelector);

        const imageBuffer = await (await page.$(captchaSelector)).screenshot();
        const base64Image = imageBuffer.toString('base64');

        const createRes = await fetch('https://api.2captcha.com/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: API_KEY,
                task: {
                    type: 'ImageToTextTask',
                    body: base64Image,
                    phrase: false,
                    case: true,
                    numeric: 0,
                    math: false,
                    minLength: 1,
                    maxLength: 5,
                    comment: 'enter the text you see on the image'
                },
                languagePool: 'en'
            })
        });

        const taskData = await createRes.json();
        if (taskData.errorId !== 0) {
            throw new Error(`❌ 2Captcha error: ${taskData.errorDescription}`);
        }

        const taskId = taskData.taskId;
        log.info(`📤 Sent captcha to 2Captcha... 🧠 Task ID: ${taskId}`);

        solutionText = null;
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultRes = await fetch('https://api.2captcha.com/getTaskResult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: API_KEY, taskId })
            });

            const resultData = await resultRes.json();
            if (resultData.status === 'ready') {
                solutionText = resultData.solution.text;
                log.info(`🎯 Captcha solved! ✅ Answer: "${solutionText}"`);
                break;
            }

            log.info(`⏳ Polling result from 2Captcha... (${i + 1}/5 tries)`);
        }

        if (!solutionText) {
            log.warning('❌ Failed to solve captcha after 5 tries.');
            continue;
        }

        const captchaInput = await page.$(captchaInputSelector);
        if (!captchaInput) throw new Error('❌ Captcha input field not found.');

        await captchaInput.click({ clickCount: 3 });
        await captchaInput.press('Backspace');
        await captchaInput.type(solutionText.toUpperCase());

        const loginButton = await page.$(loginButtonSelector);
        if (!loginButton) throw new Error('❌ Login button not found.');
        await loginButton.click();

        log.info('🔐 Clicked *Login* button... Awaiting response...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const isInvalidCaptcha = await page.$eval('#alert_error', el => el?.innerText.includes('Invalid Captcha')).catch(() => false);
        if (!isInvalidCaptcha) {
            log.info('✅ Login succeeded or captcha accepted!');
            break;
        }

        log.warning('⚠️ Invalid captcha. Refreshing and retrying...');

        const refreshButton = await page.$(refreshButtonSelector);
        if (refreshButton) await refreshButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await new Promise(resolve => setTimeout(resolve, 20000)); // wait 20s

    const presenceInExists = await page.$('#presence-in');
    if (presenceInExists) {
        log.info('🎉 Login successful! Detected "🟢 Presensi Masuk" button.');
    }

    const sayName = await page.$eval('.card-body > p.mb-1', element => element.textContent).catch(() => null);
    if (sayName) {
        log.info(`👋 Welcome, *${sayName}*!`);
    }

    // Enhanced: Get current WITA time from the website
    const getCurrentWitaTime = async () => {
        try {
            const witaTimeText = await page.$eval('#clock-wita', el => el.textContent.trim());
            log.info(`🕐 Current WITA time from website: ${witaTimeText}`);
           
            // Parse time (format: HH:MM:SS)
            const [hours, minutes, seconds] = witaTimeText.split(':').map(num => parseInt(num));
            return { hours, minutes, seconds, timeString: witaTimeText };
        } catch (error) {
            log.warning('⚠️ Could not get WITA time from website, using system time');
            // Fallback to system time (assuming WITA timezone)
            const now = new Date();
            const witaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // WITA is UTC+8
            return {
                hours: witaTime.getHours(),
                minutes: witaTime.getMinutes(),
                seconds: witaTime.getSeconds(),
                timeString: witaTime.toTimeString().split(' ')[0]
            };
        }
    };

    // Enhanced: Check presence status from buttons
    const getPresenceStatus = async () => {
        try {
            // Check presence IN status
            const presenceInBtn = await page.$('#presence-in');
            let presenceInStatus = 'NOT_FOUND';
            let presenceInTime = 'N/A';
            let presenceInDisabled = false;
           
            if (presenceInBtn) {
                // Check if button is disabled (already clicked)
                presenceInDisabled = await presenceInBtn.evaluate(btn => btn.hasAttribute('disabled'));
               
                // Get the time/status text from h5 element
                const timeText = await presenceInBtn.$eval('.flex-grow-1 h5', el => el.textContent.trim()).catch(() => '');
               
                if (presenceInDisabled && timeText && !timeText.toLowerCase().includes('belum')) {
                    presenceInStatus = 'COMPLETED';
                    presenceInTime = timeText;
                } else if (timeText.toLowerCase().includes('belum masuk')) {
                    presenceInStatus = 'NOT_DONE';
                } else {
                    presenceInStatus = 'AVAILABLE';
                }
            }
           
            // Check presence OUT status
            const presenceOutBtn = await page.$('#presence-out');
            let presenceOutStatus = 'NOT_FOUND';
            let presenceOutTime = 'N/A';
            let presenceOutDisabled = false;
           
            if (presenceOutBtn) {
                // Check if button is disabled (already clicked)
                presenceOutDisabled = await presenceOutBtn.evaluate(btn => btn.hasAttribute('disabled'));
               
                // Get the time/status text from h5 element
                const timeText = await presenceOutBtn.$eval('.flex-grow-1 h5', el => el.textContent.trim()).catch(() => '');
               
                if (presenceOutDisabled && timeText && !timeText.toLowerCase().includes('belum')) {
                    presenceOutStatus = 'COMPLETED';
                    presenceOutTime = timeText;
                } else if (timeText.toLowerCase().includes('belum pulang')) {
                    presenceOutStatus = 'NOT_DONE';
                } else {
                    presenceOutStatus = 'AVAILABLE';
                }
            }
           
            return {
                presenceIn: {
                    status: presenceInStatus,
                    time: presenceInTime,
                    disabled: presenceInDisabled
                },
                presenceOut: {
                    status: presenceOutStatus,
                    time: presenceOutTime,
                    disabled: presenceOutDisabled
                }
            };
        } catch (error) {
            log.warning('⚠️ Error checking presence status:', error.message);
            return null;
        }
    };

    // Enhanced: Time-based presence logic
    const handlePresenceBasedOnTime = async () => {
        const currentTime = await getCurrentWitaTime();
        const { hours, minutes } = currentTime;
       
        log.info(`⏰ Current time analysis: ${currentTime.timeString}`);
       
        // Morning presence window: 07:00 - 07:30
        const isMorningWindow = (hours === 7 && minutes >= 0 && minutes <= 30);
       
        // Evening presence window: 17:30 - 18:00
        const isEveningWindow = (hours === 17 && minutes >= 30) || (hours === 18 && minutes === 0);
       
        log.info(`📊 Time window analysis:`);
        log.info(`   🌅 Morning window (07:00-07:30): ${isMorningWindow ? '✅ ACTIVE' : '❌ INACTIVE'}`);
        log.info(`   🌆 Evening window (17:30-18:00): ${isEveningWindow ? '✅ ACTIVE' : '❌ INACTIVE'}`);

        // Get current presence status
        const presenceStatus = await getPresenceStatus();
       
        if (presenceStatus) {
            log.info(`📌 Current Presence Status:`);
            log.info(`   🟢 Presence IN: ${presenceStatus.presenceIn.status} ${presenceStatus.presenceIn.time !== 'N/A' ? `at ${presenceStatus.presenceIn.time}` : ''}`);
            log.info(`   🔴 Presence OUT: ${presenceStatus.presenceOut.status} ${presenceStatus.presenceOut.time !== 'N/A' ? `at ${presenceStatus.presenceOut.time}` : ''}`);
        }

        // Handle Presence In
        if (isMorningWindow) {
            const presenceInBtn = await page.$('#presence-in');
           
            if (presenceInBtn && presenceStatus) {
                if (presenceStatus.presenceIn.status === 'COMPLETED') {
                    log.info(`ℹ️ Already clocked IN today at ${presenceStatus.presenceIn.time}. Skipping presence in.`);
                } else if (presenceStatus.presenceIn.status === 'NOT_DONE' || presenceStatus.presenceIn.status === 'AVAILABLE') {
                    log.info('🌅 Morning window active! Attempting presence IN...');
                   
                    // Check if button is clickable (not disabled)
                    const isDisabled = await presenceInBtn.evaluate(btn => btn.hasAttribute('disabled'));
                    if (isDisabled) {
                        log.warning('⚠️ Presence IN button is disabled. Cannot click.');
                    } else {
                        await presenceInBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                       
                        // Handle confirmation if exists
                        const confirmBtn = await page.$('.swal2-actions .swal2-confirm');
                        if (confirmBtn) {
                            log.info('✅ Confirming presence IN...');
                            await confirmBtn.click();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                       
                        log.info('🎉 Presence IN completed!');
                    }
                }
            } else {
                log.warning('⚠️ Presence IN button not found or status check failed');
            }
        } else if (isEveningWindow) {
            const presenceOutBtn = await page.$('#presence-out');
           
            if (presenceOutBtn && presenceStatus) {
                if (presenceStatus.presenceOut.status === 'COMPLETED') {
                    log.info(`ℹ️ Already clocked OUT today at ${presenceStatus.presenceOut.time}. Skipping presence out.`);
                } else if (presenceStatus.presenceOut.status === 'NOT_DONE' || presenceStatus.presenceOut.status === 'AVAILABLE') {
                    log.info('🌆 Evening window active! Attempting presence OUT...');
                   
                    // Check if button is clickable (not disabled)
                    const isDisabled = await presenceOutBtn.evaluate(btn => btn.hasAttribute('disabled'));
                    if (isDisabled) {
                        log.warning('⚠️ Presence OUT button is disabled. Cannot click.');
                    } else {
                        await presenceOutBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                       
                        // Handle confirmation if exists
                        const confirmBtn = await page.$('.swal2-actions .swal2-confirm');
                        if (confirmBtn) {
                            log.info('✅ Confirming presence OUT...');
                            await confirmBtn.click();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                       
                        log.info('🎉 Presence OUT completed!');
                    }
                }
            } else {
                log.warning('⚠️ Presence OUT button not found or status check failed');
            }
        } else {
            log.info('⏰ Outside of presence windows. No action taken.');
            log.info('   🌅 Morning window: 07:00 - 07:30 WITA');
            log.info('   🌆 Evening window: 17:30 - 18:00 WITA');
           
        }
    };

    // Execute time-based presence logic
    await handlePresenceBasedOnTime();

    // Wait and take final screenshot
    await new Promise(resolve => setTimeout(resolve, 5000));
    const finalScreenshot = await page.screenshot({ fullPage: true });
    await context.setValue('finalScreenshot', finalScreenshot, { contentType: 'image/png' });

    // Enhanced: Get final status and attendance data
    const getFinalStatus = async () => {
        try {
            // Get presence status from buttons
            const presenceStatus = await getPresenceStatus();
           
            // Get attendance data from table
            const rowData = await page.$eval(
                '#datalist_home__dashboard tbody tr:first-child td',
                tds => tds.map(td => td.textContent.trim().toString())).catch(() => []);

            if (rowData.length > 0) {
                log.info('📅 Latest Attendance Data:');
                log.info(`   📅 Tanggal Masuk: ${rowData[0]}`);
                log.info(`   🕒 Jam Masuk: ${rowData[1]}`);
                log.info(`   📅 Tanggal Keluar: ${rowData[2]}`);
                log.info(`   🕒 Jam Keluar: ${rowData[3]}`);
                log.info(`   ⏱️ Total Jam Kerja: ${rowData[4]}`);
            }

            return {
                presenceStatus: presenceStatus,
                attendanceData: rowData
            };
        } catch (error) {
            log.warning('⚠️ Could not retrieve final status');
            return null;
        }
    };

    const finalStatus = await getFinalStatus();

    const logoutModalSelector = "#page-header-user-dropdown"
    const logoutModalBtn = await page.$(logoutModalSelector);
    await logoutModalBtn.click()

    await new Promise(resolve => setTimeout(resolve, 3000));

    const logoutSelector = ".mdi-logout"
    const logoutBtn = await page.$(logoutSelector);
    await logoutBtn.click()

    await new Promise(resolve => setTimeout(resolve, 15000));

    return {
        captchaSolved: solutionText || 'FAILED',
        timestamp: new Date().toISOString(),
        witaTime: await getCurrentWitaTime(),
        finalStatus: finalStatus
    };
}


    return results;
   
    
    await page.goto(request.url, { waitUntil: 'networkidle0' });

    log.info('🌐 Page loaded successfully');

   

    
}