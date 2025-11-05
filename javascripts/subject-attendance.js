// javascripts/subject-attendance.js
document.addEventListener('DOMContentLoaded', () => {

    // --- NEW Mobile Menu Logic ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menu-overlay');

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }
    // --- End of new logic ---


    // --- Accordion Logic ---
    const accordion = document.getElementById('attendance-accordion');

    if (accordion) {
        accordion.addEventListener('click', (e) => {
            // Find the button that was clicked
            const button = e.target.closest('.date-toggle-btn');
            if (!button) return;

            // Get the target content ID from the button's data attribute
            const targetId = button.dataset.target;
            const targetContent = document.getElementById(targetId);
            const icon = button.querySelector('.accordion-icon');

            if (targetContent) {
                // Check if it's currently open
                const isOpen = targetContent.classList.contains('open');

                // Close all other open accordions
                document.querySelectorAll('.accordion-content.open').forEach(openContent => {
                    if (openContent.id !== targetId) {
                        openContent.classList.remove('open');
                        const openButton = document.querySelector(`[data-target="${openContent.id}"]`);
                        if (openButton) {
                            openButton.querySelector('.accordion-icon').classList.remove('rotate-180');
                        }
                    }
                });

                // Toggle the clicked one
                if (isOpen) {
                    targetContent.classList.remove('open');
                    if (icon) icon.classList.remove('rotate-180');
                } else {
                    targetContent.classList.add('open');
                    if (icon) icon.classList.add('rotate-180');
                }
            }
        });
    }
});