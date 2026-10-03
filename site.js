(() => {
  const experience = document.querySelector('.stack-experience');
  const scrollAnimations = new Set();
  const tools = {
    box: { stage: '01 / RUN', name: 'LocalBox', anchor: 'run-your-first-model', description: 'A model on your machine. A local endpoint. Ready for your favourite coding tools.' },
    bench: { stage: '02 / TUNE', name: 'LocalBench', anchor: 'tune-a-model-you-already-use', description: 'Find fast, stable settings for your hardware. Export a profile and give your model room to perform.' },
    pilot: { stage: '03 / CODE', name: 'LocalPilot', anchor: 'your-first-coding-session', description: 'Give your model tools and a working loop. Explore a codebase, research a problem, and build with permissions you control.' },
    mind: { stage: '04 / REMEMBER', name: 'LocalMind', anchor: 'start-with-the-browser-interface', description: 'Keep the lessons you approve. Bring searchable project knowledge into the next session, on your own machine.' }
  };
  const nodes = experience.querySelectorAll('[data-tool]');
  nodes.forEach(node => { node.disabled = false; });
  experience.querySelector('.experience-caption').textContent = 'Four tools. Click one to explore.';
  nodes.forEach(node => node.addEventListener('click', () => {
    const tool = tools[node.dataset.tool];
    experience.dataset.active = node.dataset.tool;
    nodes.forEach(button => button.setAttribute('aria-pressed', String(button === node)));
    document.querySelector('#tool-stage').textContent = tool.stage;
    document.querySelector('#tool-description').textContent = tool.description;
    const link = document.querySelector('#tool-link');
    link.href = `https://github.com/C0deGeek-dev/${tool.name}#${tool.anchor}`;
    link.replaceChildren(document.createTextNode(`Meet ${tool.name} `));
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(arrow);
  }));

  const motion = experience.querySelector('.motion-toggle');
  motion.hidden = false;
  motion.addEventListener('click', () => {
    const paused = experience.classList.toggle('motion-paused');
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? 'Resume motion' : 'Pause motion';
    if (paused) scrollAnimations.forEach(animation => animation.cancel());
  });

  const commands = {
    unix: 'curl -fsSL https://raw.githubusercontent.com/C0deGeek-dev/LocalPilot/main/install/install.sh | sh',
    windows: 'irm https://raw.githubusercontent.com/C0deGeek-dev/LocalPilot/main/install/install.ps1 | iex'
  };
  let platform = 'unix';
  const code = document.querySelector('.install-command code');
  const feedback = document.querySelector('.install-feedback');
  const platforms = document.querySelectorAll('[data-platform]');
  document.querySelector('.install-toolbar').hidden = false;
  code.textContent = commands[platform];
  platforms.forEach(button => button.addEventListener('click', () => {
    platform = button.dataset.platform;
    code.textContent = commands[platform];
    feedback.textContent = '';
    platforms.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  document.querySelector('.copy-command').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commands[platform]);
      feedback.textContent = 'Copied. Paste it into your terminal when you are ready.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = 'Command selected. Press Ctrl+C or ⌘C to copy.';
    }
  });
  // Animate only on entry: content is always available without JS, and
  // no scroll handlers or hidden placeholders are needed.
  if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrowLayout = window.matchMedia('(max-width: 720px)');
    const revealTargets = document.querySelectorAll(
      '.workflow .section-intro, .workflow-track li, .projects .section-intro, ' +
      '.project-card, .privacy, .get-started, .proof .section-intro, ' +
      '.proof-summary, .proof-grid > *, .method-details, .closing-cta'
    );
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reducedMotion.matches || experience.classList.contains('motion-paused')) return;
        const element = entry.target;
        const staggered = element.matches('.project-card, .workflow-track li');
        const index = staggered ? [...element.parentElement.children].indexOf(element) : 0;
        const animation = element.animate([
          { opacity: 0, translate: '0 24px' },
          { opacity: 1, translate: '0 0' }
        ], {
          duration: 650,
          delay: narrowLayout.matches ? 0 : index * 75,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'backwards'
        });
        scrollAnimations.add(animation);
        const finish = () => scrollAnimations.delete(animation);
        animation.addEventListener('finish', finish, { once: true });
        animation.addEventListener('cancel', finish, { once: true });
        // Keyboard navigation should never wait for a reveal to finish.
        element.addEventListener('focusin', () => animation.cancel(), { once: true });
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(element => observer.observe(element));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) scrollAnimations.forEach(animation => animation.cancel());
    });
  }
})();
