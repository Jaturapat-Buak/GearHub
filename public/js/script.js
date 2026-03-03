const disableTransitionStyle = document.createElement('style');
disableTransitionStyle.innerHTML = '.sidebar, .main-content { transition: none !important; }';
if (document.head) document.head.appendChild(disableTransitionStyle);

function applySavedSidebarState() {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("main-content");

    if (sidebar && mainContent && window.innerWidth > 768) {
        const savedState = localStorage.getItem("sidebarState");
        if (savedState === "collapsed") {
            sidebar.classList.add("collapsed");
            mainContent.classList.add("expanded");
        } else {
            sidebar.classList.remove("collapsed");
            mainContent.classList.remove("expanded");
        }
    }
}

applySavedSidebarState();

document.addEventListener("DOMContentLoaded", function() {
    applySavedSidebarState();

    const toggleBtn = document.getElementById("toggle-sidebar"); 
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("main-content");

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (disableTransitionStyle.parentNode) {
                disableTransitionStyle.remove();
            }
        });
    });

    if (toggleBtn) {
        toggleBtn.addEventListener("click", function() {
            sidebar.classList.toggle("collapsed");
            if (mainContent) mainContent.classList.toggle("expanded");

            if (sidebar.classList.contains("collapsed")) {
                localStorage.setItem("sidebarState", "collapsed");
            } else {
                localStorage.setItem("sidebarState", "expanded");
            }
        });
    }

    window.addEventListener("resize", function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("collapsed");
            if (mainContent) mainContent.classList.remove("expanded");
        } else {
            applySavedSidebarState();
        }
    });
});

let teleportedMenu = null;
let originalParent = null;

document.addEventListener('show.bs.dropdown', function (event) {
    const button = event.target;
    const menu = button.nextElementSibling;

    if (button.closest('.table-responsive') && menu && menu.classList.contains('dropdown-menu')) {
        teleportedMenu = menu;
        originalParent = menu.parentNode;

        document.body.appendChild(menu);

        menu.style.zIndex = '9999';
    }
});

document.addEventListener('hide.bs.dropdown', function (event) {
    if (teleportedMenu && originalParent) {
        originalParent.appendChild(teleportedMenu);
        teleportedMenu = null;
        originalParent = null;
    }
});

window.addEventListener('scroll', function() {
    if (teleportedMenu) {
        const openBtn = document.querySelector('.dropdown-toggle[aria-expanded="true"]');
        if (openBtn) {
            const dpInstance = bootstrap.Dropdown.getInstance(openBtn);
            if (dpInstance) dpInstance.hide();
        }
    }
}, true);