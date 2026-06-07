// 4weird Games - Main JavaScript
// Handles: starfield canvas, typewriter, scroll reveal, mobile nav, form handling

document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initTypewriter();
    initScrollReveal();
    initMobileNav();
    initSmoothScroll();
    initContactForm();
    initParallax();
    initStickyNav();
});

// ===== STARFIELD BACKGROUND =====
function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let animationId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createStars();
    }

    function createStars() {
        stars = [];
        const count = Math.floor((canvas.width * canvas.height) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                opacity: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw stars
        stars.forEach(star => {
            star.twinklePhase += star.twinkleSpeed;
            const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
            const alpha = star.opacity * twinkle;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        });

        // Draw nebula effect
        const gradient = ctx.createRadialGradient(
            canvas.width * 0.3, canvas.height * 0.3, 0,
            canvas.width * 0.3, canvas.height * 0.3, canvas.width * 0.6
        );
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    drawStars();
}

// ===== TYPEWRITER EFFECT =====
function initTypewriter() {
    const typewriter = document.getElementById('typewriter');
    if (!typewriter) return;

    const text = 'Future Forward Fun';
    let index = 0;
    let isDeleting = false;

    function type() {
        const current = text.substring(0, index);
        typewriter.textContent = current;

        if (!isDeleting && index < text.length) {
            index++;
            setTimeout(type, 80 + Math.random() * 50);
        } else if (isDeleting && index > 0) {
            index--;
            setTimeout(type, 40);
        } else {
            isDeleting = !isDeleting;
            if (!isDeleting) {
                setTimeout(type, 2000);
            } else {
                setTimeout(type, 1000);
            }
        }
    }

    setTimeout(type, 1000);
}

// ===== SCROLL REVEAL ANIMATIONS =====
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(reveal => observer.observe(reveal));
}

// ===== MOBILE NAVIGATION =====
function initMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const spans = navToggle.querySelectorAll('span');
        
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== CONTACT FORM =====
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Show success message
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="btn-emoji">✓</span> Message Sent!';
        submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        submitBtn.disabled = true;
        
        // Reset form
        form.reset();
        
        // Reset button after delay
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
        }, 3000);
        
        console.log('Form submission:', data);
    });
}

// ===== PARALLAX EFFECT =====
function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.3;
        
        if (scrolled < window.innerHeight) {
            hero.style.transform = `translateY(${rate}px)`;
        }
    }, { passive: true });
}

// ===== STICKY NAV SHADOW =====
function initStickyNav() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}
