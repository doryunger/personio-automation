// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to wait for page to load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible')
  cy.wait(2000) // Additional wait for dynamic content
})

// Custom command to wait for page load and handle cookie popup
Cypress.Commands.add('waitForPageLoadAndHandleCookies', () => {
  cy.get('body').should('be.visible')
  cy.wait(2000) // Wait for initial page load
  
  // Handle cookie popup if it appears using simple method
  cy.handleCookiePopupSimple()
  
  // Additional wait after cookie handling
  cy.wait(1000)
})

// Custom command to check if element is visible and clickable
Cypress.Commands.add('clickIfVisible', (selector) => {
  cy.get('body').then(($body) => {
    if ($body.find(selector).length > 0) {
      cy.get(selector).should('be.visible').click()
    }
  })
})

// Custom command to fill input field safely
Cypress.Commands.add('fillInput', (selector, value) => {
  // Handle cookie popup before interacting with input
  cy.handleCookiePopupSimple()
  
  // Try normal interaction first, fallback to force if needed
  cy.get('body').then(($body) => {
    if ($body.find('#uc-overlay').length > 0) {
      cy.log('Overlay still exists, using force: true')
      cy.get(selector).should('be.visible').clear({ force: true }).type(value, { force: true })
    } else {
      cy.get(selector).should('be.visible').clear().type(value)
    }
  })
})

// Custom command to click element safely with cookie popup handling
Cypress.Commands.add('clickSafely', (selector) => {
  // Handle cookie popup before clicking
  cy.handleCookiePopupSimple()
  
  // Try normal interaction first, fallback to force if needed
  cy.get('body').then(($body) => {
    if ($body.find('#uc-overlay').length > 0) {
      cy.log('Overlay still exists, using force: true for click')
      cy.get(selector).should('be.visible').click({ force: true })
    } else {
      cy.get(selector).should('be.visible').click()
    }
  })
})

// Custom command to handle cookie popup
Cypress.Commands.add('handleCookiePopup', () => {
  cy.log('Checking for cookie popup...')
  
  // Check if cookie popup exists and handle it
  cy.get('body').then(($body) => {
    if ($body.find('#uc-main-dialog').length > 0) {
      cy.log('Cookie popup detected, attempting to accept...')
      // Wait for popup to be fully visible
      cy.get('#uc-main-dialog').should('be.visible')
      // Click the "Alles akzeptieren" (Accept All) button
      cy.get('button[data-action-type="accept"]').should('be.visible').click()
      // Wait for popup to disappear
      cy.get('#uc-main-dialog').should('not.exist')
      cy.wait(1000)
      cy.log('Cookie popup handled successfully')
    } else {
      cy.log('No cookie popup detected, proceeding...')
    }
  })
})

// Enhanced command to handle cookie popup with multiple selectors and retry logic
Cypress.Commands.add('handleCookiePopupRobust', () => {
  cy.log('Robustly checking for cookie popup...')
  
  // Multiple selectors for cookie popup detection
  const cookieSelectors = [
    '#uc-main-dialog',
    '#uc-overlay',
    '[data-testid="cookie-banner"]',
    '.cookie-banner',
    '.cookie-popup',
    '[class*="cookie"]',
    '[id*="cookie"]'
  ]
  
  // Check if any cookie popup exists
  cy.get('body').then(($body) => {
    let popupFound = false
    let foundSelector = null
    
    // Check for any cookie popup using multiple selectors
    for (let i = 0; i < cookieSelectors.length; i++) {
      const selector = cookieSelectors[i]
      if ($body.find(selector).length > 0) {
        popupFound = true
        foundSelector = selector
        break
      }
    }
    
    if (popupFound) {
      cy.log(`Cookie popup found with selector: ${foundSelector}`)
      
      // Wait for popup to be visible
      cy.get(foundSelector).should('be.visible')
      
      // Look specifically for the data-action-type="accept" button as specified
      cy.get('body').then(($body) => {
        if ($body.find('button[data-action-type="accept"]').length > 0) {
          cy.log('Found accept button with data-action-type="accept"')
          cy.get('button[data-action-type="accept"]').should('be.visible').click()
          
          // Wait for popup to disappear
          cy.get(foundSelector).should('not.exist')
          cy.wait(1000)
          cy.log('Cookie popup handled successfully')
        } else {
          cy.log('No accept button with data-action-type="accept" found, proceeding without clicking')
        }
      })
    } else {
      cy.log('No cookie popup detected, proceeding...')
    }
  })
})

// Custom command to handle Personio login flow
Cypress.Commands.add('personioLogin', (companyDomain, username, password) => {
  cy.log('=== STARTING PERSONIO LOGIN PROCESS ===')
  
  // Step 1: Navigate to login page and handle cookie popup
  cy.visit('/login/')
  cy.log('Visited login page')
  cy.waitForPageLoadAndHandleCookies()
  
  // Step 2: Handle cookie popup before filling company domain
  cy.handleCookiePopupSimple()
  cy.log('Looking for company domain input...')
  cy.get('input[name="hostname"]').should('be.visible')
  cy.fillInput('input[name="hostname"]', companyDomain)
  cy.clickSafely('button[type="submit"]')
  cy.log('Submitted company domain')
  
  // Step 3: Wait for redirect and handle cookie popup before filling username
  cy.wait(3000) // Wait for redirect
  
  // Handle cross-origin redirect to login.personio.com
  cy.origin('https://login.personio.com', { args: { username, password } }, ({ username, password }) => {
    cy.url().then(url => {
      cy.log(`Current URL after company domain submission: ${url}`)
    })
    
    // Simple cookie popup handling within origin context
    cy.wait(2000)
    cy.get('body').then(($body) => {
      const asideExists = $body.find('aside').length > 0
      if (asideExists) {
        cy.log('Cookie popup detected, handling via Shadow DOM...')
        cy.window().then((win) => {
          const asideElements = win.document.querySelectorAll('aside')
          if (asideElements.length > 0) {
            const firstAside = asideElements[0]
            const shadowRoot = firstAside.shadowRoot
            if (shadowRoot) {
              const acceptButton = shadowRoot.querySelector('button[data-action="consent"][data-action-type="accept"]')
              if (acceptButton) {
                cy.log('Found accept button in Shadow DOM, clicking it...')
                acceptButton.click()
                cy.wait(2000)
              }
            }
          }
        })
      }
    })
    
    // Check if we're on the username page or if we need to wait
    cy.get('body').then(($body) => {
      const usernameInput = $body.find('input[name="username"]')
      if (usernameInput.length > 0) {
        cy.log('Username input found, proceeding...')
        cy.get('input[name="username"]').should('be.visible')
        cy.get('input[name="username"]').clear().type(username)
        cy.get('button[type="submit"]').click()
        cy.log('Submitted username')
      } else {
        cy.log('Username input not found, waiting for page to load...')
        cy.wait(2000)
        cy.get('input[name="username"]').should('be.visible')
        cy.get('input[name="username"]').clear().type(username)
        cy.get('button[type="submit"]').click()
        cy.log('Submitted username after wait')
      }
    })
  })
  
  // Step 4: Wait for password page and handle cookie popup before filling password
  cy.wait(3000) // Wait for redirect
  
  // Continue in the same origin context for password
  cy.origin('https://login.personio.com', () => {
    cy.url().then(url => {
      cy.log(`Current URL after username submission: ${url}`)
    })
    
    // Simple cookie popup handling within origin context
    cy.wait(2000)
    cy.get('body').then(($body) => {
      const asideExists = $body.find('aside').length > 0
      if (asideExists) {
        cy.log('Cookie popup detected, handling via Shadow DOM...')
        cy.window().then((win) => {
          const asideElements = win.document.querySelectorAll('aside')
          if (asideElements.length > 0) {
            const firstAside = asideElements[0]
            const shadowRoot = firstAside.shadowRoot
            if (shadowRoot) {
              const acceptButton = shadowRoot.querySelector('button[data-action="consent"][data-action-type="accept"]')
              if (acceptButton) {
                cy.log('Found accept button in Shadow DOM, clicking it...')
                acceptButton.click()
                cy.wait(2000)
              }
            }
          }
        })
      }
    })
    
    cy.get('body').then(($body) => {
      const passwordInput = $body.find('input[name="password"]')
      if (passwordInput.length > 0) {
        cy.log('Password input found, proceeding...')
        cy.get('input[name="password"]').should('be.visible')
        cy.get('input[name="password"]').clear().type(password)
        cy.get('button[type="submit"]').click()
        cy.log('Submitted password')
      } else {
        cy.log('Password input not found, waiting for page to load...')
        cy.wait(2000)
        cy.get('input[name="password"]').should('be.visible')
        cy.get('input[name="password"]').clear().type(password)
        cy.get('button[type="submit"]').click()
        cy.log('Submitted password after wait')
      }
    })
  })
  
  // Step 5: Wait for successful login and verify redirect
  cy.wait(5000) // Wait longer for login to complete
  
  // Handle redirect to company domain
  cy.origin('https://alpine-eagle-gmbh.app.personio.com', () => {
    cy.url().then(url => {
      cy.log(`Current URL after password submission: ${url}`)
    })
    
    // Check if we're on the company domain
    cy.url().should('include', 'alpine-eagle-gmbh.app.personio.com')
    cy.log('Successfully redirected to company domain')
    
    // Simple cookie popup handling within origin context
    cy.wait(2000)
    cy.get('body').then(($body) => {
      const asideExists = $body.find('aside').length > 0
      if (asideExists) {
        cy.log('Cookie popup detected, handling via Shadow DOM...')
        cy.window().then((win) => {
          const asideElements = win.document.querySelectorAll('aside')
          if (asideElements.length > 0) {
            const firstAside = asideElements[0]
            const shadowRoot = firstAside.shadowRoot
            if (shadowRoot) {
              const acceptButton = shadowRoot.querySelector('button[data-action="consent"][data-action-type="accept"]')
              if (acceptButton) {
                cy.log('Found accept button in Shadow DOM, clicking it...')
                acceptButton.click()
                cy.wait(2000)
              }
            }
          }
        })
      }
    })
    
    // Wait for page to fully load
    cy.wait(3000)
    cy.log('=== PERSONIO LOGIN PROCESS COMPLETED ===')
  })
})

// Enhanced command to handle cookie popup with optional waiting
Cypress.Commands.add('handleCookiePopupWithWait', (waitTime = 5000) => {
  cy.log(`Checking for cookie popup with ${waitTime}ms wait...`)
  
  // Multiple selectors for cookie popup detection
  const cookieSelectors = [
    '#uc-main-dialog',
    '[data-testid="cookie-banner"]',
    '.cookie-banner',
    '.cookie-popup',
    '[class*="cookie"]',
    '[id*="cookie"]'
  ]
  
  // Wait for popup to potentially appear, but don't fail if it doesn't
  cy.get('body', { timeout: waitTime }).then(($body) => {
    let popupFound = false
    let foundSelector = null
    
    // Check for any cookie popup using multiple selectors
    for (let i = 0; i < cookieSelectors.length; i++) {
      const selector = cookieSelectors[i]
      if ($body.find(selector).length > 0) {
        popupFound = true
        foundSelector = selector
        break
      }
    }
    
    if (popupFound) {
      cy.log(`Cookie popup found with selector: ${foundSelector}`)
      
      // Wait for popup to be visible
      cy.get(foundSelector).should('be.visible')
      
      // Look specifically for the data-action-type="accept" button as specified
      cy.get('body').then(($body) => {
        if ($body.find('button[data-action-type="accept"]').length > 0) {
          cy.log('Found accept button with data-action-type="accept"')
          cy.get('button[data-action-type="accept"]').should('be.visible').click()
          
          // Wait for popup to disappear
          cy.get(foundSelector).should('not.exist')
          cy.wait(1000)
          cy.log('Cookie popup handled successfully')
        } else {
          cy.log('No accept button with data-action-type="accept" found, proceeding without clicking')
        }
      })
    } else {
      cy.log(`No cookie popup detected after ${waitTime}ms wait, proceeding...`)
    }
  }).catch(() => {
    // If timeout occurs (no popup found), just proceed
    cy.log(`No cookie popup appeared within ${waitTime}ms, proceeding...`)
  })
})

// Simple and direct cookie popup handler with Shadow DOM support
Cypress.Commands.add('handleCookiePopupSimple', () => {
  cy.log('=== COOKIE POPUP DEBUG START ===')
  
  // Force wait for page to load
  cy.wait(2000)
  
  // Check if overlay is blocking interaction
  cy.get('body').then(($body) => {
    const overlayExists = $body.find('#uc-overlay').length > 0
    const dialogExists = $body.find('#uc-main-dialog').length > 0
    const asideExists = $body.find('aside').length > 0
    
    cy.log(`Overlay exists: ${overlayExists}`)
    cy.log(`Dialog exists: ${dialogExists}`)
    cy.log(`Aside elements exist: ${asideExists}`)
    
    if (overlayExists || dialogExists || asideExists) {
      cy.log('Cookie popup/overlay detected, looking for accept button')
      
      // Try multiple approaches to find and click the accept button
      cy.get('body').then(($body) => {
        // Approach 1: Look for data-action-type="accept"
        if ($body.find('button[data-action-type="accept"]').length > 0) {
          cy.log('Found button with data-action-type="accept"')
          cy.get('button[data-action-type="accept"]').should('be.visible').click({ force: true })
          cy.wait(2000)
        }
        // Approach 2: Look for "Accept All" text
        else if ($body.find('button:contains("Accept All")').length > 0) {
          cy.log('Found "Accept All" button')
          cy.get('button:contains("Accept All")').should('be.visible').click({ force: true })
          cy.wait(2000)
        }
        // Approach 3: Look for "Alles akzeptieren" text
        else if ($body.find('button:contains("Alles akzeptieren")').length > 0) {
          cy.log('Found "Alles akzeptieren" button')
          cy.get('button:contains("Alles akzeptieren")').should('be.visible').click({ force: true })
          cy.wait(2000)
        }
        // Approach 4: Look for any button in the dialog
        else if ($body.find('#uc-main-dialog button').length > 0) {
          cy.log('Found button in dialog')
          cy.get('#uc-main-dialog button').first().should('be.visible').click({ force: true })
          cy.wait(2000)
        }
        // Approach 5: Try Shadow DOM if aside elements exist
        else if (asideExists) {
          cy.log('No buttons found in regular DOM, trying Shadow DOM...')
          cy.log('Attempting to access Shadow DOM of first aside element')
          
          // Use Cypress to execute JavaScript to access Shadow DOM
          cy.window().then((win) => {
            const asideElements = win.document.querySelectorAll('aside')
            if (asideElements.length > 0) {
              const firstAside = asideElements[0]
              const shadowRoot = firstAside.shadowRoot
              
              if (shadowRoot) {
                cy.log('Successfully accessed Shadow DOM')
                const shadowButtons = shadowRoot.querySelectorAll('button')
                cy.log(`Found ${shadowButtons.length} buttons in Shadow DOM`)
                
                // Log details about buttons in Shadow DOM
                shadowButtons.forEach((button, index) => {
                  const text = button.textContent.trim()
                  const id = button.id
                  const className = button.className
                  cy.log(`  Shadow button ${index}: id="${id}", class="${className}", text="${text}"`)
                })
                
                // Look for accept button in Shadow DOM
                const acceptButtonInShadow = shadowRoot.querySelector('button[data-action="consent"][data-action-type="accept"]')
                const acceptButtonByIdInShadow = shadowRoot.querySelector('#accept')
                const acceptButtonByClassInShadow = shadowRoot.querySelector('.accept.uc-accept-button')
                
                if (acceptButtonInShadow) {
                  cy.log('Found accept button in Shadow DOM, clicking it...')
                  acceptButtonInShadow.click()
                  cy.wait(2000)
                } else if (acceptButtonByIdInShadow) {
                  cy.log('Found #accept button in Shadow DOM, clicking it...')
                  acceptButtonByIdInShadow.click()
                  cy.wait(2000)
                } else if (acceptButtonByClassInShadow) {
                  cy.log('Found .accept.uc-accept-button in Shadow DOM, clicking it...')
                  acceptButtonByClassInShadow.click()
                  cy.wait(2000)
                } else {
                  cy.log('No accept button found in Shadow DOM')
                }
              } else {
                cy.log('Shadow DOM not accessible (might be closed)')
              }
            } else {
              cy.log('No aside elements found')
            }
          })
        }
        // Approach 6: Look for any button that might be an accept button
        else {
          cy.log('No specific accept button found, trying any button')
          const allButtons = $body.find('button')
          cy.log(`Total buttons on page: ${allButtons.length}`)
          
          // Log first few buttons for debugging
          allButtons.slice(0, 5).each((index, button) => {
            const $button = Cypress.$(button)
            const text = $button.text().trim()
            const dataActionType = $button.attr('data-action-type')
            cy.log(`Button ${index}: text="${text}", data-action-type="${dataActionType}"`)
          })
          
          // Try clicking the first button if any exist
          if (allButtons.length > 0) {
            cy.get('button').first().should('be.visible').click({ force: true })
            cy.wait(2000)
          }
        }
        
        // Verify if overlay/dialog disappeared
        cy.get('body').then(($bodyAfter) => {
          const overlayStillExists = $bodyAfter.find('#uc-overlay').length > 0
          const dialogStillExists = $bodyAfter.find('#uc-main-dialog').length > 0
          
          cy.log(`After clicking - Overlay still exists: ${overlayStillExists}`)
          cy.log(`After clicking - Dialog still exists: ${dialogStillExists}`)
          
          if (!overlayStillExists && !dialogStillExists) {
            cy.log('✅ Cookie popup handled successfully')
          } else {
            cy.log('❌ Cookie popup still exists after clicking')
          }
        })
      })
    } else {
      cy.log('No overlay or dialog detected, proceeding...')
    }
  })
  
  cy.log('=== COOKIE POPUP DEBUG END ===')
}) 