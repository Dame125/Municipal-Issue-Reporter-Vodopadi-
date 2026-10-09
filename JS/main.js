 document.addEventListener("DOMContentLoaded", function () {
        const observerOptions = {
          threshold: 0.15,
        };

        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-active");
            }
          });
        }, observerOptions);

        const revealElements = document.querySelectorAll(
          ".reveal, .reveal-left, .reveal-right",
        );
        revealElements.forEach((el) => observer.observe(el));
      });

      const rangeInput = document.getElementById("ba-range-input");
      const beforeWrapper = document.querySelector(".img-before-wrapper");
      const handle = document.querySelector(".ba-handle");

      if (rangeInput) {
        rangeInput.addEventListener("input", (e) => {
          const sliderValue = e.target.value + "%";
          beforeWrapper.style.width = sliderValue;
          handle.style.left = sliderValue;
        });
      }


      const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });