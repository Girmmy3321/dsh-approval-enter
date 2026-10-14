window.__ModuleLoader__.load({
  id: 'dsh-approval-enter',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports

    // Selectors taken from @deepseek-ai/dsh-client-ui-approval's own render:
    //   - the panel root carries `data-approval-key` and owns the keydown handler
    //   - the detail area carries `data-approval-scroll` and `tabIndex: 0`
    // The official handler only answers Enter/Esc when `document.activeElement`
    // is inside the panel root, so moving focus there is all this plugin needs
    // to do. The detail area is `role="group"`, not a button, so the panel's
    // "Enter on a button keeps the button's own action" guard does not fire.
    const PANEL_SELECTOR = '[data-approval-key]'
    const TARGET_SELECTOR = '[data-approval-scroll]'

    /** Element that had focus before the panel appeared, so it can be restored. */
    let restoreTo = null
    /** Approval key currently on screen, used to act once per request. */
    let currentKey = null
    /** Whether this plugin has already made its one focus decision for `currentKey`. */
    let decided = false
    /** Coalesces bursts of mutations into one animation frame. */
    let scheduled = false
    let observer = null

    function focusQuietly(el) {
      if (!el || typeof el.focus !== 'function') return
      try {
        el.focus({ preventScroll: true })
      } catch {
        try {
          el.focus()
        } catch {
          /* focus is best-effort; never throw out of a key path */
        }
      }
    }

    /** True when `el` sits somewhere the user is actively writing text. */
    function hasDraft(el) {
      if (!el) return false
      const tag = (el.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') {
        return typeof el.value === 'string' && el.value.length > 0
      }
      if (el.isContentEditable) {
        return (el.textContent || '').trim().length > 0
      }
      return false
    }

    /**
     * Move focus inside the panel and confirm it actually landed there.
     *
     * The detail area renders with `tabIndex: 0`, so it normally takes focus as
     * shipped. If a future build drops that, a plain `focus()` on a
     * non-focusable node is a silent no-op — and focus is the whole mechanism
     * here — so grant a programmatic tab stop and try once more.
     */
    function focusInto(panel) {
      let preferred = null
      try {
        preferred = panel.querySelector(TARGET_SELECTOR)
      } catch {
        /* fall back to the panel root */
      }
      for (const el of [preferred, panel]) {
        if (!el) continue
        focusQuietly(el)
        if (document.activeElement && panel.contains(document.activeElement)) return true
        if (typeof el.setAttribute === 'function') {
          let existing = null
          try {
            existing = el.getAttribute('tabindex')
          } catch {
            /* treat as absent */
          }
          if (existing === null || existing === '') {
            try {
              el.setAttribute('tabindex', '-1')
            } catch {
              /* ignore */
            }
            focusQuietly(el)
            if (document.activeElement && panel.contains(document.activeElement)) return true
          }
        }
      }
      return false
    }

    function sync() {
      scheduled = false
      if (typeof document === 'undefined') return

      let panel = null
      try {
        panel = document.querySelector(PANEL_SELECTOR)
      } catch {
        return
      }

      if (!panel) {
        currentKey = null
        decided = false
        if (restoreTo !== null) {
          const back = restoreTo
          restoreTo = null
          if (back && back.isConnected) focusQuietly(back)
        }
        return
      }

      let key = null
      try {
        key = panel.getAttribute('data-approval-key')
      } catch {
        /* fall through with a null key */
      }

      if (key !== currentKey) {
        currentKey = key
        decided = false
        const active = document.activeElement
        if (active && active !== document.body && !panel.contains(active)) {
          restoreTo = active
        }
      }

      if (decided) return

      const active = document.activeElement

      // Already inside (the user tabbed in, or another plugin did it): done.
      if (active && panel.contains(active)) {
        decided = true
        return
      }

      // Never yank focus out of a half-written message. Enter keeps meaning
      // "send" there, and Tab still reaches the panel by hand.
      if (hasDraft(active)) return

      decided = true
      focusInto(panel)
    }

    function schedule() {
      if (scheduled) return
      scheduled = true
      const run = () => {
        try {
          sync()
        } catch {
          /* a failed sync must never surface into the app */
        }
      }
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
      else setTimeout(run, 0)
    }

    function apply(ctx) {
      if (typeof document === 'undefined' || typeof MutationObserver !== 'function') return
      try {
        observer = new MutationObserver(schedule)
        observer.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
        })
        schedule()
      } catch {
        return
      }

      const dispose = () => {
        try {
          if (observer) observer.disconnect()
        } catch {
          /* ignore */
        }
        observer = null
      }

      try {
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(() => dispose, 'dsh-approval-enter: approval focus observer')
          return
        }
      } catch {
        /* fall through to the returned disposer */
      }
      return dispose
    }

    // `inject: []` means "needs no service", so this activates immediately.
    exports.apply = apply
    exports.inject = []
    return module.exports
  },
})
