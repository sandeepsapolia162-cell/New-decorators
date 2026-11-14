// First-admin setup uses a same-origin script so a restrictive script-src 'self'
// policy does not block it. The form itself remains visible if this file fails.
(() => {
  const form = document.getElementById('setupForm');
  const message = document.getElementById('message');
  if (!form || !message) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Creating administrator…';

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-setup-key': fields.get('key')
        },
        body: JSON.stringify({
          email: fields.get('email'),
          password: fields.get('password')
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Setup failed. Please check the setup key and try again.');
      message.textContent = 'Administrator created. You can now sign in.';
      window.setTimeout(() => { window.location.href = '/admin'; }, 1000);
    } catch (error) {
      message.textContent = error.message || 'Could not contact the setup service. Please try again.';
      submit.disabled = false;
    }
  });
})();
