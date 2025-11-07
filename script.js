// Color definitions
const COLORS = {
    black: { value: 0, hex: '#000000', dark: true },
    brown: { value: 1, hex: '#654321', dark: true },
    red: { value: 2, hex: '#FF0000', dark: true },
    orange: { value: 3, hex: '#FF8800', dark: false },
    yellow: { value: 4, hex: '#FFFF00', dark: false },
    green: { value: 5, hex: '#00FF00', dark: false },
    blue: { value: 6, hex: '#0000FF', dark: true },
    violet: { value: 7, hex: '#9400D3', dark: true },
    gray: { value: 8, hex: '#808080', dark: false },
    white: { value: 9, hex: '#FFFFFF', dark: false },
    gold: { value: -1, hex: '#FFD700', dark: false },
    silver: { value: -2, hex: '#C0C0C0', dark: false }
};

const MULTIPLIERS = {
    black: 1, brown: 10, red: 100, orange: 1000, yellow: 10000,
    green: 100000, blue: 1000000, violet: 10000000, gray: 100000000,
    white: 1000000000, gold: 0.1, silver: 0.01
};

const TOLERANCE = {
    brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1,
    gray: 0.05, gold: 5, silver: 10
};

const TOLERANCE_COLORS = ['brown', 'red', 'green', 'blue', 'violet', 'gray', 'gold', 'silver'];
const DIGIT_COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray', 'white'];
const MULTIPLIER_COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray', 'white', 'gold', 'silver'];

// E12 series for standard values
const E12_SERIES = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

// Calculate relative luminance for contrast determination
function getLuminance(hex) {
    // Convert hex to RGB
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;

    // Apply gamma correction
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Calculate relative luminance
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// Get appropriate text color (black or white) based on background
function getTextColor(bgHex) {
    const luminance = getLuminance(bgHex);
    // Use white text on dark backgrounds, black text on light backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// State
let state = {
    mode: 4,
    bands: ['brown', 'black', 'red', 'gold'],
    resistance: 1000,
    tolerance: 5,
    warning: ''
};

// Create proxy for reactive updates
state = new Proxy(state, {
    set(target, property, value) {
        target[property] = value;
        render();
        return true;
    }
});

// Calculate resistance from colors
function calculateResistance() {
    const bands = state.bands;
    const mode = state.mode;

    if (mode === 4) {
        const digit1 = COLORS[bands[0]]?.value ?? 0;
        const digit2 = COLORS[bands[1]]?.value ?? 0;
        const multiplier = MULTIPLIERS[bands[2]] ?? 1;
        const tolerance = TOLERANCE[bands[3]] ?? 5;

        state.resistance = (digit1 * 10 + digit2) * multiplier;
        state.tolerance = tolerance;
    } else {
        const digit1 = COLORS[bands[0]]?.value ?? 0;
        const digit2 = COLORS[bands[1]]?.value ?? 0;
        const digit3 = COLORS[bands[2]]?.value ?? 0;
        const multiplier = MULTIPLIERS[bands[3]] ?? 1;
        const tolerance = TOLERANCE[bands[4]] ?? 5;

        state.resistance = (digit1 * 100 + digit2 * 10 + digit3) * multiplier;
        state.tolerance = tolerance;
    }

    // Check if it's a standard value
    checkStandardValue();
}

// Check if resistance is a standard E12 value
function checkStandardValue() {
    const r = state.resistance;
    let magnitude = 1;
    let normalized = r;

    while (normalized >= 100) {
        normalized /= 10;
        magnitude *= 10;
    }
    while (normalized < 10) {
        normalized *= 10;
        magnitude /= 10;
    }

    const closest = E12_SERIES.reduce((prev, curr) =>
        Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
    );

    const standardValue = closest * magnitude;

    if (Math.abs(r - standardValue) / standardValue > 0.01) {
        state.warning = '⚠ Non-standard value';
    } else {
        state.warning = '';
    }
}

// Format resistance value
function formatResistance(ohms) {
    if (ohms >= 1000000) {
        const value = ohms / 1000000;
        return `${value % 1 === 0 ? value : value.toFixed(2)} MΩ`;
    } else if (ohms >= 1000) {
        const value = ohms / 1000;
        return `${value % 1 === 0 ? value : value.toFixed(2)} kΩ`;
    } else {
        return `${ohms % 1 === 0 ? ohms : ohms.toFixed(2)} Ω`;
    }
}

// Parse resistance input
function parseResistance(input) {
    input = input.trim().toLowerCase().replace(/[ωω]/, '');

    let multiplier = 1;
    if (input.endsWith('m')) {
        multiplier = 1000000;
        input = input.slice(0, -1);
    } else if (input.endsWith('k')) {
        multiplier = 1000;
        input = input.slice(0, -1);
    }

    const value = parseFloat(input);
    if (isNaN(value) || value <= 0) {
        return null;
    }

    return value * multiplier;
}

// Convert resistance to colors
function resistanceToColors(ohms) {
    // Find closest E12 value
    let magnitude = 1;
    let normalized = ohms;

    while (normalized >= 100) {
        normalized /= 10;
        magnitude *= 10;
    }
    while (normalized < 10 && magnitude > 1) {
        normalized *= 10;
        magnitude /= 10;
    }

    const closest = E12_SERIES.reduce((prev, curr) =>
        Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
    );

    const standardValue = closest * magnitude;

    // Find multiplier
    let value = Math.round(standardValue);
    let mult = 1;
    let multIndex = 0;

    const multiplierValues = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];

    if (state.mode === 4) {
        // Get two digits
        while (value >= 100 && multIndex < multiplierValues.length - 1) {
            value /= 10;
            multIndex++;
        }

        const d1 = Math.floor(value / 10);
        const d2 = value % 10;

        const digit1Color = DIGIT_COLORS[d1] || 'black';
        const digit2Color = DIGIT_COLORS[d2] || 'black';
        const multiplierColor = Object.keys(MULTIPLIERS).find(k => MULTIPLIERS[k] === multiplierValues[multIndex]) || 'black';

        return [digit1Color, digit2Color, multiplierColor, 'gold'];
    } else {
        // Get three digits
        while (value >= 1000 && multIndex < multiplierValues.length - 1) {
            value /= 10;
            multIndex++;
        }

        const d1 = Math.floor(value / 100);
        const d2 = Math.floor((value % 100) / 10);
        const d3 = value % 10;

        const digit1Color = DIGIT_COLORS[d1] || 'black';
        const digit2Color = DIGIT_COLORS[d2] || 'black';
        const digit3Color = DIGIT_COLORS[d3] || 'black';
        const multiplierColor = Object.keys(MULTIPLIERS).find(k => MULTIPLIERS[k] === multiplierValues[multIndex]) || 'black';

        return [digit1Color, digit2Color, digit3Color, multiplierColor, 'gold'];
    }
}

// Render functions
function renderResistorBands() {
    const container = document.getElementById('resistor-bands');
    container.innerHTML = '';

    const bands = state.bands;
    const mode = state.mode;

    if (mode === 4) {
        bands.slice(0, 3).forEach(color => {
            const band = document.createElement('div');
            band.className = 'band';
            band.style.background = COLORS[color]?.hex || '#000000';
            container.appendChild(band);
        });

        const spacing = document.createElement('div');
        spacing.className = 'band spacing';
        container.appendChild(spacing);

        const toleranceBand = document.createElement('div');
        toleranceBand.className = 'band';
        toleranceBand.style.background = COLORS[bands[3]]?.hex || '#FFD700';
        toleranceBand.style.marginRight = '80px';
        container.appendChild(toleranceBand);
    } else {
        bands.slice(0, 4).forEach(color => {
            const band = document.createElement('div');
            band.className = 'band';
            band.style.background = COLORS[color]?.hex || '#000000';
            container.appendChild(band);
        });

        const spacing = document.createElement('div');
        spacing.className = 'band spacing';
        container.appendChild(spacing);

        const toleranceBand = document.createElement('div');
        toleranceBand.className = 'band';
        toleranceBand.style.background = COLORS[bands[4]]?.hex || '#FFD700';
        toleranceBand.style.marginRight = '80px';
        container.appendChild(toleranceBand);
    }
}

function renderControls() {
    const container = document.getElementById('controls');
    container.innerHTML = '';

    const bandCount = state.mode === 4 ? 4 : 5;
    const labels = state.mode === 4
        ? ['Band 1', 'Band 2', 'Multiplier', 'Tolerance']
        : ['Band 1', 'Band 2', 'Band 3', 'Multiplier', 'Tolerance'];

    for (let i = 0; i < bandCount; i++) {
        const control = document.createElement('div');
        control.className = 'band-control';

        const label = document.createElement('label');
        label.textContent = labels[i];
        control.appendChild(label);

        const selector = document.createElement('div');
        selector.className = 'color-selector';

        const current = document.createElement('div');
        current.className = 'color-current';
        const currentColor = state.bands[i] || 'black';
        current.style.background = COLORS[currentColor].hex;
        current.className += COLORS[currentColor].dark ? ' dark-bg' : ' light-bg';
        current.textContent = currentColor.toUpperCase();
        current.dataset.index = i;

        const options = document.createElement('div');
        options.className = 'color-options';

        let colorList;
        if (i === bandCount - 1) {
            colorList = TOLERANCE_COLORS;
        } else if (i === bandCount - 2) {
            colorList = MULTIPLIER_COLORS;
        } else {
            colorList = DIGIT_COLORS;
        }

        colorList.forEach(colorName => {
            const option = document.createElement('div');
            option.className = 'color-option';
            const bgColor = COLORS[colorName].hex;
            option.style.background = bgColor;
            option.dataset.color = colorName;
            option.dataset.index = i;

            // Set text color based on background luminance
            const textColor = getTextColor(bgColor);

            const colorNameSpan = document.createElement('span');
            colorNameSpan.className = 'color-name';
            colorNameSpan.style.color = textColor;
            colorNameSpan.textContent = colorName.toUpperCase();
            option.appendChild(colorNameSpan);

            // Add value based on band type
            let valueText = '';
            if (i === bandCount - 1) {
                // Tolerance band
                valueText = `±${TOLERANCE[colorName]}%`;
            } else if (i === bandCount - 2) {
                // Multiplier band
                const mult = MULTIPLIERS[colorName];
                if (mult >= 1000000000) {
                    valueText = `×${mult / 1000000000}G`;
                } else if (mult >= 1000000) {
                    valueText = `×${mult / 1000000}M`;
                } else if (mult >= 1000) {
                    valueText = `×${mult / 1000}k`;
                } else if (mult < 1) {
                    valueText = `×${mult}`;
                } else {
                    valueText = `×${mult}`;
                }
            } else {
                // Digit band
                valueText = COLORS[colorName].value.toString();
            }

            const valueSpan = document.createElement('span');
            valueSpan.className = 'color-value';
            valueSpan.style.color = textColor;
            valueSpan.textContent = valueText;
            option.appendChild(valueSpan);

            options.appendChild(option);
        });

        selector.appendChild(current);
        selector.appendChild(options);
        control.appendChild(selector);
        container.appendChild(control);
    }
}

function renderResult() {
    const input = document.getElementById('resistance-input');
    const toleranceDisplay = document.getElementById('tolerance-display');
    const formattedValue = formatResistance(state.resistance);

    // Update only the value part (without Ω and tolerance)
    input.value = formattedValue.replace(' Ω', '').replace(' kΩ', 'k').replace(' MΩ', 'M');

    // Update tolerance separately
    toleranceDisplay.textContent = `±${state.tolerance}%`;

    document.getElementById('warning').textContent = state.warning;
}

function render() {
    renderResistorBands();
    renderControls();
    renderResult();
}

// Event listeners
document.addEventListener('click', (e) => {
    // Mode toggle
    if (e.target.matches('.mode-toggle button')) {
        const mode = parseInt(e.target.dataset.mode);

        document.querySelectorAll('.mode-toggle button').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Convert bands when switching modes
        if (mode === 4 && state.mode === 5) {
            state.bands = [state.bands[0], state.bands[1], state.bands[3], state.bands[4]];
        } else if (mode === 5 && state.mode === 4) {
            state.bands = [state.bands[0], state.bands[1], 'black', state.bands[2], state.bands[3]];
        }

        state.mode = mode;
        calculateResistance();
        render();
    }

    // Color selector toggle
    if (e.target.matches('.color-current')) {
        document.querySelectorAll('.color-options').forEach(opt => {
            if (opt !== e.target.nextElementSibling) {
                opt.classList.remove('show');
            }
        });
        e.target.nextElementSibling.classList.toggle('show');
    }

    // Color selection
    const colorOption = e.target.closest('.color-option');
    if (colorOption) {
        const index = parseInt(colorOption.dataset.index);
        const color = colorOption.dataset.color;

        state.bands[index] = color;
        calculateResistance();

        colorOption.parentElement.classList.remove('show');
    }

    // Close color options when clicking outside
    if (!e.target.matches('.color-current') && !e.target.closest('.color-option')) {
        document.querySelectorAll('.color-options').forEach(opt => {
            opt.classList.remove('show');
        });
    }
});

// Resistance input
document.getElementById('convert-btn').addEventListener('click', () => {
    const input = document.getElementById('resistance-input').value;
    const ohms = parseResistance(input);
    const warningEl = document.getElementById('warning');

    if (ohms === null) {
        warningEl.textContent = 'Invalid resistance value';
        return;
    }

    if (ohms < 0.1 || ohms > 999000000) {
        warningEl.textContent = 'Value out of range (0.1Ω - 999MΩ)';
        return;
    }

    warningEl.textContent = '';
    const colors = resistanceToColors(ohms);
    state.bands = colors;
    calculateResistance();

    // Show adjusted value if different
    if (Math.abs(state.resistance - ohms) / ohms > 0.01) {
        warningEl.textContent = `Closest standard value: ${formatResistance(state.resistance)}`;
    }
});

document.getElementById('resistance-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('convert-btn').click();
    }
});

// Initialize
calculateResistance();
render();
