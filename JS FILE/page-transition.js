document.addEventListener('DOMContentLoaded', () => {
    
    // Create and append the loading overlay to the document
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Loading...</div>
    `;
    document.body.appendChild(loadingOverlay);

    // Function to re-initialize scripts after AJAX load
    function reinitializeScripts() {
        // Re-init intersection observer for reveals
        const reveals = document.querySelectorAll('.reveal');
        const revealOnScroll = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                } else {
                    entry.target.classList.remove('active');
                }
            });
        }, {
            root: null,
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        });
        reveals.forEach(reveal => revealOnScroll.observe(reveal));

        // Re-init slider if on home page
        if (typeof startAutoPlay === 'function' && document.getElementById('bg-image')) {
            const bgImage = document.getElementById('bg-image');
            if (bgImage && window.autoPlayInterval === undefined) {
                startAutoPlay();
            }
        }
        
        initMobileMenu(); // Rebind mobile menu after SPA swap
    }

    // Mobile Menu Global Logic
    function initMobileMenu() {
        const mobileMenuBtns = document.querySelectorAll('.mobile-menu-btn');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        // Create a single click handler function to avoid duplicate bindings
        const openMenu = () => {
            if(mobileMenu) {
                mobileMenu.classList.remove('translate-x-full');
                document.body.style.overflow = 'hidden'; 
            }
        };

        const closeMenu = () => {
            if(mobileMenu) {
                mobileMenu.classList.add('translate-x-full');
                document.body.style.overflow = '';
            }
        };

        // Remove old listeners if re-initializing
        if (mobileMenuBtns.length > 0) {
            mobileMenuBtns.forEach(btn => {
                btn.removeEventListener('click', openMenu);
                btn.addEventListener('click', openMenu);
            });
        }

        if (closeMenuBtn) {
            closeMenuBtn.removeEventListener('click', closeMenu);
            closeMenuBtn.addEventListener('click', closeMenu);
        }

        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.removeEventListener('click', closeMenu);
                link.addEventListener('click', closeMenu);
            });
        }
    }

    // Initialize mobile menu on first load
    initMobileMenu();

    // Intercept clicks on links
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        
        const targetUrl = link.getAttribute('href');
        
        // Let standard browser handle hashes, empty links, external links
        if (!targetUrl || targetUrl.startsWith('#') || link.target === '_blank' || targetUrl.startsWith('http')) {
            return;
        }
        
        // If clicking a link to the exact same page, let it be
        const currentPath = window.location.pathname.split('/').pop() || 'home.html';
        const targetPath = targetUrl.split('#')[0];
        if (currentPath === targetPath) {
            return;
        }

        e.preventDefault();
        
        const mainContent = document.getElementById('page-content');
        if (!mainContent) {
            window.location.href = targetUrl;
            return;
        }

        // START TRANSITION: Fade out the main content and fade IN the loading spinner
        mainContent.classList.add('fade-out');
        loadingOverlay.classList.add('active');

        // Fetch the new page behind the scenes
        fetch(targetUrl)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.getElementById('page-content');
                
                if (newContent) {
                    // Update the URL in the browser bar without reloading
                    window.history.pushState({}, doc.title, targetUrl);
                    document.title = doc.title;
                    
                    // Store the new body class to apply during swap
                    const newBodyClass = doc.body.className;

                    const desktopNavSelector = 'nav .xl\\:flex a[href]';
                    const currentDesktopLinks = document.querySelectorAll(desktopNavSelector);
                    const newDesktopLinks = doc.querySelectorAll(desktopNavSelector);
                    
                    if (currentDesktopLinks.length && newDesktopLinks.length) {
                        const activeHrefs = new Set();
                        newDesktopLinks.forEach(link => {
                            if (link.classList.contains('border-b-2')) {
                                activeHrefs.add(link.getAttribute('href'));
                            }
                        });
                        currentDesktopLinks.forEach(link => {
                            const href = link.getAttribute('href');
                            if (!href || link.classList.contains('rounded-full')) return;
                            if (activeHrefs.has(href)) {
                                link.classList.remove('text-charcoal', 'hover:text-sunset');
                                link.classList.add('text-sunset', 'border-b-2', 'border-sunset', 'pb-1');
                            } else {
                                link.classList.remove('text-sunset', 'border-b-2', 'border-sunset', 'pb-1');
                                link.classList.add('text-charcoal', 'hover:text-sunset');
                            }
                        });
                    }

                    const mobileNavSelector = '#mobile-menu .space-y-5 a[href]';
                    const currentMobileLinks = document.querySelectorAll(mobileNavSelector);
                    const newMobileLinks = doc.querySelectorAll(mobileNavSelector);
                    
                    if (currentMobileLinks.length && newMobileLinks.length) {
                        const activeMobileHrefs = new Set();
                        newMobileLinks.forEach(link => {
                            if (!link.classList.contains('hover:text-sunset') && link.classList.contains('text-sunset')) {
                                activeMobileHrefs.add(link.getAttribute('href'));
                            }
                        });
                        currentMobileLinks.forEach(link => {
                            const href = link.getAttribute('href');
                            if (!href || link.classList.contains('rounded-full')) return;
                            if (activeMobileHrefs.has(href)) {
                                link.classList.remove('hover:text-sunset');
                                link.classList.add('text-sunset');
                            } else {
                                link.classList.add('hover:text-sunset');
                                link.classList.remove('text-sunset');
                            }
                        });
                    }

                    // Wait enough time for the fade-out to finish (400ms), then swap content
                    setTimeout(() => {
                        // Apply body class during the swap when content is hidden
                        document.body.className = newBodyClass;
                        
                        mainContent.innerHTML = newContent.innerHTML;
                        
                        // Execute any scripts found in the new content
                        Array.from(mainContent.querySelectorAll("script")).forEach(oldScript => {
                            const newScript = document.createElement("script");
                            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                            oldScript.parentNode.replaceChild(newScript, oldScript);
                        });
                        
                        // Scroll to top automatically when changing pages
                        window.scrollTo(0, 0);
                        if (window.lenis) {
                            window.lenis.scrollTo(0, { immediate: true });
                        }

                        // Re-run any needed animations/scripts on the new content
                        reinitializeScripts();
                        
                        // END TRANSITION: Fade content back in and fade OUT the loading spinner
                        mainContent.classList.remove('fade-out');
                        loadingOverlay.classList.remove('active');
                    }, 400); 

                } else {
                    // Fallback just in case
                    window.location.href = targetUrl;
                }
            })
            .catch(() => {
                window.location.href = targetUrl;
            });
    });

    // Handle user pressing the back button in the browser
    window.addEventListener('popstate', () => {
        window.location.reload(); // Simple reload for back button
    });
});