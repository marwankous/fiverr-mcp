if (!self.FMcp) self.FMcp = {};

// Profile edit page (/sellers/<username>/edit) is a React SPA.
// Fields auto-save on blur — there is no submit button.
// React controlled inputs require the native value setter to bypass React's synthetic handler.

function reactSetValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  nativeSetter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

self.FMcp.update_profile = async function(params) {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  if (params.displayName !== undefined) {
    const el = await self.FMcp.waitFor('input[placeholder="Add display name"]');
    el.focus();
    reactSetValue(el, params.displayName);
    el.blur();
    await wait(400);
  }

  if (params.professionalTitle !== undefined) {
    const el = await self.FMcp.waitFor('input[placeholder="Add title"]');
    el.focus();
    reactSetValue(el, params.professionalTitle);
    el.blur();
    await wait(400);
  }

  if (params.bio !== undefined) {
    // Bio text is shown as a static <p>; click it to open the textarea editor
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let bioTrigger = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      // Click the About section header or any existing bio text paragraph
      const p = node.parentElement?.closest('p, [data-track-tag="text"]');
      if (p && node.textContent.trim().length > 20) {
        // Prefer a paragraph that sits near the word "About"
        const nearby = p.closest('[class]');
        if (nearby) { bioTrigger = p; break; }
      }
    }

    // Fallback: find any <p> with substantial text in the main content area
    if (!bioTrigger) {
      const ps = Array.from(document.querySelectorAll('p[data-track-tag="text"], p[class*="lt2csqk"]'));
      bioTrigger = ps.find(p => p.textContent.trim().length > 30) || null;
    }

    if (bioTrigger) {
      bioTrigger.click();
      await wait(800);
    }

    const ta = await self.FMcp.waitFor('textarea[placeholder*="details about yourself"], textarea[placeholder*="Share some"]', 8000);
    ta.focus();
    reactSetValue(ta, params.bio);
    ta.blur();
    await wait(600);
  }

  return 'Profile updated successfully';
};
