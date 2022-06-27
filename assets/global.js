var Shopify = Shopify || {};
// ---------------------------------------------------------------------------
// Money format handler
// ---------------------------------------------------------------------------
Shopify.money_format = "${{amount}}";
Shopify.formatMoney = function(cents, format) {
  if (typeof cents == 'string') { cents = cents.replace('.',''); }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = (format || this.money_format);

  function defaultOption(opt, def) {
     return (typeof opt == 'undefined' ? def : opt);
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ',');
    decimal   = defaultOption(decimal, '.');

    if (isNaN(number) || number == null) { return 0; }

    number = (number/100.0).toFixed(precision);

    var parts   = number.split('.'),
        dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
        cents   = parts[1] ? (decimal + parts[1]) : '';

    return dollars + cents;
  }

  switch(formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
};

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true })

    this.querySelectorAll('button').forEach(
      (button) => button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');
    this.closeBtns = this.querySelectorAll('.menu-drawer__close-button');
    if (navigator.platform === 'iPhone') document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.closeBtns.forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach(details => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach(submenu => {
      submenu.classList.remove('submenu-open');
    });
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
    this.exTriggerBtns = document.querySelectorAll(".header-menu-drawer-trigger");
    this.summaryElement = this.querySelector("summary[aria-controls='menu-drawer']");
    this.exTriggerBtns.forEach((exTriggerBtn)=>{
      exTriggerBtn.addEventListener('click', ()=>{
        this.openMenuDrawer(this.summaryElement);
        this.querySelector("#Details-menu-drawer-container").setAttribute('open', true);
      });
    })
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.getElementById('shopify-section-header');
    this.borderOffset = this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
  }

  closeMenuDrawer(event, elementToFocus) {
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
  }
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver(entries => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor((this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset);
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(new CustomEvent('slideChanged', { detail: {
        currentPage: this.currentPage,
        currentElement: this.sliderItemsToShow[this.currentPage - 1]
      }}));
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (element.offsetLeft + element.clientWidth) <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition = event.currentTarget.name === 'next' ? this.slider.scrollLeft + (step * this.sliderItemOffset) : this.slider.scrollLeft - (step * this.sliderItemOffset);
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach(link => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    // this.addEventListener('mouseover', this.focusInHandling.bind(this));
    // this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    // this.addEventListener('focusin', this.focusInHandling.bind(this));
    // this.addEventListener('focusout', this.focusOutHandling.bind(this));

    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) return;

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach(link => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
    this.play();
  }

  focusInHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
      this.play();
    } else if (this.autoplayButtonIsSetToPlay) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition = this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  setSlideVisibility() {
    this.sliderItemsToShow.forEach((item, index) => {
      const button = item.querySelector('a');
      if (index === this.currentPage - 1) {
        if (button) button.removeAttribute('tabindex');
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (button) button.setAttribute('tabindex', '-1');
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.isOriginSelector = this.dataset.isOrigin == "true" ? true : false;
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    if(!this.isOriginSelector){
      this.updateOptions();
      this.updateMasterId();
    } else {
      this.currentVariant = this.getVariantData().find((variant) => {
        return variant.id == this.querySelector(".single-option-selector").value;
      })
    }
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      //this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGallery = document.getElementById(`MediaGallery-${this.dataset.section}`);
    mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true);

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector( `[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(`price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        if (source && destination) destination.innerHTML = source.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);


class UpsellVariant extends HTMLElement{
  constructor(){
    super();
  }
  connectedCallback(){
    this.productForm = document.getElementById(`${this.dataset.productFormId}`);
    this.productData = JSON.parse(this.querySelector("#upsell-product-data").textContent);
    this.addToCart = this.productForm.querySelector("[type='submit']");
    this.addToCartText = this.addToCart.querySelector(".add-to-cart-text");
    this.salePriceEl = this.productForm.querySelector(".price-item--sale"); 
    this.comparePriceEl = this.productForm.querySelector(".price-item--compare");
    this.addEventListener('change', this.upsellVariantChange);
  }
  upsellVariantChange(){
    const selectedVariantId = this.querySelector("[name='id']").value;
    this.getSelectedVariant(selectedVariantId);
    if(this.selectedVariant){
     this.updatePrice();
     this.updateButton(); 
    }
  }
  getSelectedVariant(vid){
    this.selectedVariant = this.productData.variants.find((variant) => {
      return variant.id == vid;
    })
  }

  updatePrice(){
    this.salePriceEl.textContent = Shopify.formatMoney(this.selectedVariant.price, window.MoneyFormat);
    if(this.selectedVariant.compare_at_price > this.selectedVariant.price){
      if(!this.comparePriceEl){
        this.comparePriceEl = document.createElement("span");
        this.comparePriceEl.classList.add("price-item--sale");
        this.productForm.querySelector(".product__price--wrapper").appendChild(this.comparePriceEl);
      }
      this.comparePriceEl.innerHTML = `RRP <s>${Shopify.formatMoney(this.selectedVariant.compare_at_price, window.MoneyFormat)}</s>`
    }else{
      this.comparePriceEl.remove();
    }
  }

  updateButton(){
    if(this.selectedVariant.available){
      this.addToCart.removeAttribute('disabled');
      this.addToCartText.textContent = window.variantStrings.addToCart;
    }else{
      this.addToCart.setAttribute('disabled', 'disable');
      this.addToCartText.textContent = window.variantStrings.soldOut;
    }
  }
  
}

customElements.define('upsell-variant-selector', UpsellVariant);
/*======================================================
Custom Scripts
========================================================*/
// Script for AnnouncementBar
class AnnouncementBar extends HTMLElement{
  constructor(){
    super();
    this.initialItemIndex = 0; 
    this.nextItemIndex = 1;
    this.announcementItemNodeList = this.querySelectorAll(".announcement-bar");
    this.announcementItemNodeCount = this.announcementItemNodeList.length;
  }
  connectedCallback(){
    setInterval(()=>{
      this.announcementItemNodeList[this.initialItemIndex].classList.remove("mobile-show");
      this.announcementItemNodeList[this.initialItemIndex].classList.add("mobile-hide");

      this.announcementItemNodeList[this.nextItemIndex].classList.remove("mobile-hide");
      this.announcementItemNodeList[this.nextItemIndex].classList.add("mobile-show");
      
      this.initialItemIndex = this.initialItemIndex + 1; 
      if(this.initialItemIndex < this.announcementItemNodeCount - 1 ){
        this.nextItemIndex = this.initialItemIndex + 1; 
      } else if(this.initialItemIndex == this.announcementItemNodeCount - 1 ){
        this.nextItemIndex = 0; 
      } else {
        this.initialItemIndex = 0; 
        this.nextItemIndex = this.initialItemIndex + 1; 
      }
    }, 2000);
  }
}

customElements.define('announcement-bar', AnnouncementBar);

// LocalizationForm
class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      button: this.querySelector('button'),
      panel: this.querySelector('.disclosure__list-wrapper'),
    };
    this.elements.button.addEventListener('click', this.openSelector.bind(this));
    this.elements.button.addEventListener('focusout', this.closeSelector.bind(this));
    this.addEventListener('keyup', this.onContainerKeyUp.bind(this));

    this.querySelectorAll('a').forEach(item => item.addEventListener('click', this.onItemClick.bind(this)));
  }

  hidePanel() {
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.panel.setAttribute('hidden', true);
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    this.hidePanel();
    this.elements.button.focus();
  }

  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;
    if (form) form.submit();
  }

  openSelector() {
    this.elements.button.focus();
    this.elements.panel.toggleAttribute('hidden');
    this.elements.button.setAttribute('aria-expanded', (this.elements.button.getAttribute('aria-expanded') === 'false').toString());
  }

  closeSelector(event) {
    const shouldClose = event.relatedTarget && event.relatedTarget.nodeName === 'BUTTON';
    if (event.relatedTarget === null || shouldClose) {
      this.hidePanel();
    }
  }
}

customElements.define('localization-form', LocalizationForm);

class ProgressBar extends HTMLElement{
  constructor(){
    super();
    this.progressBar = this.querySelector(".progress-bar");
    document.addEventListener('scroll', ()=>{
      let cstp = Math.abs(document.body.getBoundingClientRect().top);
      this.setWidth(cstp);
    });

    document.addEventListener('resize', () => {
      let cstp = Math.abs(document.body.getBoundingClientRect().top);
      this.setWidth(cstp);
    })
  }

  connectedCallback(){
    setTimeout(() => {
      let curScrollTopPos = Math.abs(document.body.getBoundingClientRect().top);
      this.setWidth(curScrollTopPos);
    }, 1000);
  }

  setWidth(curScrollTopPos){
      let initialParams = this.getInitialValues();
      let curScrollBottom = curScrollTopPos + initialParams.windowHeight;
      let progressWidth = (curScrollTopPos / initialParams.fullScrollAmount) * 100;
      this.progressBar.style.width = progressWidth + '%';
  }

  getInitialValues(){
    let initialParams = {
      windowHeight : window.innerHeight, 
      documentHeight: document.body.clientHeight
    }
    initialParams.fullScrollAmount = initialParams.documentHeight - initialParams.windowHeight;

    return initialParams;
  }
}

customElements.define('progress-bar', ProgressBar);

class ProductSingleTabs extends HTMLElement{
  constructor(){
    super();
    this.readMoreTrigger = document.getElementById("readmore");
    if(this.readMoreTrigger){
      this.readMoreTrigger.addEventListener('click', (e) =>{
        e.preventDefault();
        let detailTabHeader = document.querySelector("[data-tab-header='details']");
        let tabClientRectY = this.getBoundingClientRect().top;
        // let scrollAmount = Math.abs(tabClientRectY - document.body.getBoundingClientRect().top) + 100;
        let scrollAmount = $(this).offset().top - 100;
        this.showTabs(detailTabHeader);
        window.scrollTo({top: scrollAmount, behavior: 'smooth'});
      })
    }
    this.querySelectorAll("[data-tab-header]").forEach((tabHeader)=>{
      tabHeader.addEventListener('click', ()=>{
        this.showTabs(tabHeader);
      })
    }) 
  }

  showTabs(tabHeader){
    let oldOpenTabContent = this.querySelector("[data-tab-content].product-single__tabs-text--active");
    let oldOpenTabHeader = this.querySelector("[data-tab-header].product-single__tabs-button--active");
    let targetTabContent = this.querySelector(`[data-tab-content="${tabHeader.getAttribute('data-tab-header')}"]`);
    if(targetTabContent && oldOpenTabContent != targetTabContent){
      // Close old opened tab header and content
      oldOpenTabHeader.classList.remove("product-single__tabs-button--active");
      oldOpenTabContent.classList.remove("product-single__tabs-text--active");

      //Open new target Tab header and content
      tabHeader.classList.add("product-single__tabs-button--active");
      targetTabContent.classList.add("product-single__tabs-text--active");
    }
  }
}

customElements.define('product-single-tabs', ProductSingleTabs);

class RecentlyViewedProducts extends HTMLElement{
  constructor(){
    super();
    this.count_recently_item = parseInt(this.getAttribute("data-item-count"));
    this.parser = new DOMParser();
    this.recentlyItemsWrapper = this.querySelector("[data-recently-item-wrapper]");
  }

  connectedCallback(){
    this.showRecentlyViewed();
  }

  static cookie(b, j, m){
    if (typeof j != "undefined") {
      m = m || {};
      if (j === null) {
        j = "";
        m.expires = -1
      }
      var e = "";
      if (m.expires && (typeof m.expires == "number" || m.expires.toUTCString)) {
        var f;
        if (typeof m.expires == "number") {
          f = new Date();
          f.setTime(f.getTime() + (m.expires * 24 * 60 * 60 * 1000))
        } else {
          f = m.expires
        }
        e = "; expires=" + f.toUTCString()
      }
      var l = m.path ? "; path=" + (m.path) : "";
      var g = m.domain ? "; domain=" + (m.domain) : "";
      var a = m.secure ? "; secure" : "";
      document.cookie = [b, "=", encodeURIComponent(j), e, l, g, a].join("")
    } else {
      var d = null;
      if (document.cookie && document.cookie != "") {
        var k = document.cookie.split(";");
        for (var h = 0; h < k.length; h++) {
          var c = k[h].trim();
          if (c.substring(0, b.length + 1) == (b + "=")) {
            d = decodeURIComponent(c.substring(b.length + 1));
            break
          }
        }
      }
      return d
    }
  }

  showRecentlyViewed(){
    let handleArray = RecentlyViewedProducts.cookie(RecentlyViewedProducts.config.name).split(" ");
    let requestParams = [];
    handleArray.forEach((handle, index) => {
      if(index < this.count_recently_item){
        let handleURL = `https://${window.location.hostname}/products/${handle}?view=recently_viewed`;
        let requestParam = fetch(handleURL, {cache: 'no-cache'});
        requestParams.push(requestParam);
      }
    });
    Promise.all(requestParams)
      .then((responses) => {
        return Promise.all(responses.map((response)=>{
          return response.text();
        }))
      }).then((data)=>{
        data.forEach((itemHTMLText) => {
          let itemHTML = this.parser.parseFromString(itemHTMLText, 'text/html').querySelector(".recently-viewed--item");
          if(itemHTML){
            this.recentlyItemsWrapper.appendChild(itemHTML);
          }
        })
      })
  }

  static setRecentItem(){
    if(window.location.pathname.indexOf("/products/") !== -1){
      let newItemHandle = window.location.pathname.match(/\/products\/([a-z0-9\-]+)/)[1];
      let itemHandles = RecentlyViewedProducts.cookie(RecentlyViewedProducts.config.name).split(" ");
      let newItemHandleIndex = itemHandles.indexOf(newItemHandle);
      let storeLimit = RecentlyViewedProducts.config.store_item_limit
      if(newItemHandleIndex === -1){
        itemHandles.unshift(newItemHandle);
        itemHandles.splice( storeLimit - 1);
      }else{
        itemHandles.splice(newItemHandleIndex, 1);
        itemHandles.unshift(newItemHandle);
      }
      let newItems = itemHandles.join(" ");
      RecentlyViewedProducts.cookie(RecentlyViewedProducts.config.name, newItems, RecentlyViewedProducts.config.cookieConfiguration);
    }
  }

  static config =  {
    name : "shopify_recently_viewed", 
    store_item_limit: 10,
    cookieConfiguration: {
      domain: window.location.hostname,
      expires: 90, 
      path: "/"
    }
  }
}

RecentlyViewedProducts.setRecentItem();
customElements.define("recently-viewed", RecentlyViewedProducts);


class CustomCollectionFilter extends HTMLElement{
  constructor(){
    super();
    this.filterGroups = this.querySelectorAll(".filter-group");
    this.mobileFilterTrigger = this.querySelector(".mobile-filter__toggle"); 
    this.filterMenu = this.querySelector(".filter-menu")
    this.filterGroups.forEach((filterGroup) => {
      let triggerButton = filterGroup.querySelector(".menu-trigger"); 
      triggerButton.addEventListener('click', ()=>{
        if(filterGroup.classList.contains('active')){
          filterGroup.classList.remove('active');
        }else{
          if(this.querySelector('.filter-group.active') && this.querySelector('.filter-group.active') != filterGroup){
            this.querySelector('.filter-group.active').classList.remove('active');
          }

          filterGroup.classList.add('active');
        }
      })
    })

    this.mobileFilterTrigger.addEventListener('click', ()=>{
      let filterMenuHeight = document.body.getBoundingClientRect().bottom - this.getBoundingClientRect().bottom;
      console.log(filterMenuHeight);
      if(this.filterMenu){
        if(this.filterMenu.classList.contains('active')){
          this.filterMenu.classList.remove('active');
          this.querySelector(".filter-open--text.open").style.display = 'block';
          this.querySelector(".filter-open--text.close").style.display = 'none';
        }else{
          this.filterMenu.classList.add('active');
          this.filterMenu.style.height = filterMenuHeight + 'px';
          this.querySelector(".filter-open--text.open").style.display = 'none';
          this.querySelector(".filter-open--text.close").style.display = 'block';          
        }
      }
    });
    document.body.addEventListener('click', (e) => {
      let activedFilterGroup = this.querySelector(".filter-group.active");
      if(activedFilterGroup && !e.target.closest(".filter-group")){
        activedFilterGroup.classList.remove("active");
      }
    })
  }

  showDropdown(filterGroup){
    let filterDropdown = filterGroup.querySelector(".filter-dropdown--body");
    filterGroup.classList.add('active');
  }

  openDropdown(filterGroup){
    let filterDropdown = filterGroup.querySelector(".filter-dropdown--body");
    filterGroup.classList.remove("active");
  }
}

customElements.define('custom-collection-filter', CustomCollectionFilter);

class ProductMatchingColours extends HTMLElement{
  constructor(){
      super();
  }
  connectedCallback(){
      const searchUrl = `/search?type=product&q=handle:${this.dataset.searchHandle}*&view=match`;
      fetch(searchUrl)
          .then( response => response.text())
          .then( matcheddata => {
              let matchedDatas = new DOMParser().parseFromString(matcheddata, 'text/html').querySelectorAll(".matching-product-item");
              let matchedSize = 0;
              if (matchedDatas.length > 0) {
                  matchedDatas.forEach((matchedData) =>{
                    if(this.dataset.productHandle != matchedData.dataset.productHandle){
                      this.querySelector("#matchedproducts").appendChild(matchedData);
                      matchedSize = matchedSize + 1;
                    };
                  });
                  //document.getElementById('matchedproductsbutton').style.display = "inline-block";
                  // this.removeSelf();
                  if(matchedSize > 0 ){
                    $(".matching-colors-slider").slick(
                      {
                        infinite: false,
                        slidesToShow: 5,
                        slidesToScroll: 1,
                        arrows: false,
                        dots: false,
                        fade: false,
                        autoplay: false,
                        infinite: true,
                        pauseOnHover: false,
                        responsive: [
                          {
                            breakpoint: 1280,
                            settings: {
                              dots: true,
                              arrows: false,
                              slidesToShow: 3
                            }
                          },
                          {
                            breakpoint: 768,
                            settings: {
                              dots: true,
                              arrows: false,
                              slidesToShow: 1
                            }
                          }
                        ]
                      }
                    );                  
                  }else{
                    this.classList.add('hidden');
                  }
              }
          })
  }

  removeSelf(){
      document.getElementById(`mp-${this.dataset.productHandle}`).remove();
  }
}
customElements.define('product-matching-colours', ProductMatchingColours);

class ProductSizeGuide extends HTMLElement{
  constructor(){
    super();
  }

  connectedCallback(){
    let sizeGuideTrigger = document.querySelector(".product-single__size-btn");
    sizeGuideTrigger.addEventListener('click', (e)=>{
      e.preventDefault();
      this.classList.add("size-guide__wrapper--active");
    });
    this.closeButton = this.querySelector(".product-single__size-btn-close");
    this.closeButton.addEventListener('click', ()=>{
      this.classList.remove("size-guide__wrapper--active"); 
    })
    document.body.addEventListener("click", (e)=>{
      console.log(e.target);
      if(e.target == this){
        this.classList.remove("size-guide__wrapper--active");
      }
    })
  }
}

customElements.define('product-size-guide', ProductSizeGuide);