// script.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get references to the cart count element and all product buttons
    const cartCountElement = document.getElementById('cart-count');
    const allButtons = document.querySelectorAll('.product-card button');
    let cartItemCount = 0;

    // 2. Loop through every button and attach a click listener
    allButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Stop the default button action (if any)
            event.preventDefault();

            // 3. Find the product name associated with the clicked button
            // We traverse up to the parent card, then look for the <h3> element
            const productCard = button.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            
            // 4. Check the button text to perform the right action
            if (button.textContent === 'Add to Cart') {
                // Update the cart count
                cartItemCount++;
                cartCountElement.textContent = cartItemCount;

                // Provide user feedback
                alert(`✅ ${productName} added to cart! Total items: ${cartItemCount}`);
                
                // Optional: Change button style temporarily
                button.textContent = 'Added!';
                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                }, 1000);

            } else if (button.textContent === 'View Details') {
                // Provide simple feedback for "View Details"
                alert(`🔍 Showing details for ${productName}. This would link to a separate product page.`);
            }
        });
    });

    // 5. Simple form submission handler for the Contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Stop the form from submitting normally (reloading the page)
            alert('Thank you! Your message has been sent to Kisan Setu.');
            contactForm.reset(); // Clear the form fields
        });
    }
});
