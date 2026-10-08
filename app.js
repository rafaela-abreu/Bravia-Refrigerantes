const UNIT_PRICE = 35;
const DELIVERY_FEE = 12;
const PIX_KEY_DISPLAY = '61 994431648';
const PIX_KEY = '+5561994431648';
const WHATSAPP_NUMBER = '5561994431648';
let quantity = 1;
let pixPayload = '';

const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (selector) => document.querySelector(selector);

function crc16Ccitt(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function pixField(id, value) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function makePixPayload(total) {
  const merchantAccount = pixField('00', 'BR.GOV.BCB.PIX') + pixField('01', PIX_KEY);
  const additional = pixField('05', '***');
  const body = pixField('00', '01') + pixField('26', merchantAccount) + pixField('52', '0000') + pixField('53', '986') + pixField('54', total.toFixed(2)) + pixField('58', 'BR') + pixField('59', 'BRAVIA REFRIGERANTES') + pixField('60', 'BRASILIA') + pixField('62', additional);
  return `${body}6304${crc16Ccitt(`${body}6304`)}`;
}

function updateSummary() {
  const subtotal = quantity * UNIT_PRICE;
  const total = subtotal + DELIVERY_FEE;
  $('#quantity').textContent = quantity;
  $('#subtotal').textContent = money(subtotal);
  $('#total').textContent = money(total);
  $('#summary-quantity').textContent = `${quantity} ${quantity === 1 ? 'garrafa' : 'garrafas'}`;
  $('#summary-subtotal').textContent = money(subtotal);
  $('#summary-total').textContent = money(total);
  pixPayload = makePixPayload(total);
  $('#pix-code').textContent = pixPayload;
  renderQrCode(pixPayload);
}

function updateOrderPreview() {
  const name = $('#customer-name').value.trim();
  const phone = $('#customer-phone').value.trim();
  const city = $('#city').value.trim();
  const address = $('#address').value.trim();
  $('#summary-name').textContent = name || 'Aguardando preenchimento';
  $('#summary-phone').textContent = phone || 'WhatsApp não informado';
  $('#summary-address').textContent = address ? `${address} · ${city || 'cidade não informada'}` : `Endereço não informado · ${city || 'cidade não informada'}`;
}

function renderQrCode(payload) {
  const qr = $('#pix-qr');
  const fallback = $('#qr-fallback');
  qr.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qr, { text: payload, width: 108, height: 108, colorDark: '#3e0b12', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    fallback.hidden = true;
  } else {
    fallback.hidden = false;
    fallback.textContent = 'Copie o código Pix abaixo para pagar.';
  }
}

function setFeedback(message, isError = false) {
  const feedback = $('#order-feedback');
  feedback.textContent = message;
  feedback.classList.toggle('error', isError);
}

async function copyText(text, button, successText) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      if (!document.execCommand('copy')) throw new Error('copy blocked');
      helper.remove();
    }
    const original = button.textContent;
    button.textContent = successText;
    button.classList.add('is-copied');
    setTimeout(() => { button.textContent = original; button.classList.remove('is-copied'); }, 1800);
  } catch (error) {
    setFeedback('Não foi possível copiar automaticamente. Selecione e copie o código manualmente.', true);
  }
}

function validateForm() {
  const fields = ['#customer-name', '#customer-phone', '#city', '#address'];
  let valid = true;
  const messages = { '#customer-name': 'Informe seu nome.', '#customer-phone': 'Informe um WhatsApp com DDD.', '#city': 'Informe sua cidade e UF.', '#address': 'Informe o endereço completo.' };
  fields.forEach((selector) => {
    const field = $(selector);
    const value = field.value.trim();
    const filled = selector === '#customer-phone' ? value.replace(/\D/g, '').length >= 10 : value.length > 2;
    field.classList.toggle('has-error', !filled);
    field.setAttribute('aria-invalid', String(!filled));
    const error = document.querySelector(`${selector}-error`);
    if (error) error.textContent = filled ? '' : messages[selector];
    if (!filled) valid = false;
  });
  if (!valid) {
    setFeedback('Revise os campos destacados antes de enviar o pedido.', true);
    $(fields.find((selector) => $(selector).classList.contains('has-error'))).focus();
  }
  return valid;
}

function buildOrderMessage() {
  const name = $('#customer-name').value.trim();
  const phone = $('#customer-phone').value.trim();
  const city = $('#city').value;
  const address = $('#address').value.trim();
  const subtotal = quantity * UNIT_PRICE;
  const total = subtotal + DELIVERY_FEE;
  return `Olá, BRÁVIA! Quero fazer uma encomenda.\n\n*PEDIDO BRÁVIA*\n• Produto: Garrafa BRÁVIA Original 2L\n• Quantidade: ${quantity} ${quantity === 1 ? 'garrafa' : 'garrafas'}\n• Subtotal: ${money(subtotal)}\n• Taxa de entrega: ${money(DELIVERY_FEE)}\n• *Total: ${money(total)}*\n\n*ENTREGA*\n• Nome: ${name}\n• WhatsApp: ${phone}\n• Cidade: ${city}\n• Endereço: ${address}\n\nVou realizar o pagamento via Pix para a chave ${PIX_KEY_DISPLAY} e enviarei o comprovante por aqui. Aguardo a confirmação da disponibilidade e da entrega. Obrigado!`;
}

$('#decrease').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); updateSummary(); });
$('#increase').addEventListener('click', () => { quantity = Math.min(20, quantity + 1); updateSummary(); });
$('#copy-key').addEventListener('click', (event) => copyText(PIX_KEY_DISPLAY, event.currentTarget, 'Chave copiada'));
$('#copy-code').addEventListener('click', (event) => copyText(pixPayload, event.currentTarget, 'Código copiado'));
$('#order-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  setFeedback('Abrindo o WhatsApp com os detalhes da sua encomenda…');
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage())}`;
  const whatsappWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!whatsappWindow) setFeedback('O navegador bloqueou a abertura. Use o botão do WhatsApp e permita pop-ups para concluir.', true);
});

['#customer-name', '#customer-phone', '#city', '#address'].forEach((selector) => {
  $(selector).addEventListener('input', (event) => {
    event.currentTarget.classList.remove('has-error');
    event.currentTarget.setAttribute('aria-invalid', 'false');
    const error = document.querySelector(`${selector}-error`);
    if (error) error.textContent = '';
    updateOrderPreview();
  });
});
const mainVideo = document.querySelector('.main-video');
if (mainVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) mainVideo.pause();

const backgroundMusic = $('#background-music');
const musicPlayerCard = $('#music-player-card');
const musicPlayToggle = $('#music-play-toggle');
const musicDisable = $('#music-disable');
const musicStatus = $('#music-player-status');
const musicPlayIcon = document.querySelector('.music-play-icon');
const musicPauseIcon = document.querySelector('.music-pause-icon');

if (backgroundMusic && musicPlayerCard && musicPlayToggle && musicDisable && musicStatus) {
  backgroundMusic.volume = 0.2;
  backgroundMusic.loop = true;

  const updateMusicPlayer = (isPlaying, statusText) => {
    musicPlayerCard.classList.toggle('is-playing', isPlaying);
    musicPlayToggle.setAttribute('aria-pressed', String(isPlaying));
    musicPlayToggle.setAttribute('aria-label', isPlaying ? 'Pausar música oficial da Brávia' : 'Ouvir a música oficial da Brávia');
    musicStatus.textContent = statusText || (isPlaying ? 'Música tocando.' : 'Música desligada.');
    musicDisable.disabled = !isPlaying;
    if (musicPlayIcon) musicPlayIcon.toggleAttribute('hidden', isPlaying);
    if (musicPauseIcon) musicPauseIcon.toggleAttribute('hidden', !isPlaying);
  };

  const startMusic = async () => {
    musicStatus.textContent = 'Iniciando música.';
    try {
      await backgroundMusic.play();
      updateMusicPlayer(true);
    } catch (error) {
      updateMusicPlayer(false, 'A música não iniciou. Tente novamente.');
    }
  };

  musicPlayToggle.addEventListener('click', async () => {
    if (backgroundMusic.paused) {
      await startMusic();
    } else {
      backgroundMusic.pause();
    }
  });

  musicDisable.addEventListener('click', () => {
    backgroundMusic.pause();
    if (backgroundMusic.readyState > 0) backgroundMusic.currentTime = 0;
  });

  backgroundMusic.addEventListener('play', () => updateMusicPlayer(true));
  backgroundMusic.addEventListener('pause', () => updateMusicPlayer(false));
  updateMusicPlayer(false, 'Clique para ouvir · repetição contínua');
}

updateSummary();
updateOrderPreview();
