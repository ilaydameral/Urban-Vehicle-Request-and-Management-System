# CITYRIDE - UBER-INSPIRED BLUE DESIGN SYSTEM
## UI/UX Design Documentation

**Design Philosophy:** Clean, Professional, Map-First Interface  
**Color Scheme:** Deep Midnight Blue (replacing Uber Black)  
**Framework:** React + Vite + Tailwind CSS

---

## 🎨 COLOR PALETTE

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Midnight 900** | `#0f172a` | Headers, main buttons, primary text |
| **Midnight 800** | `#1e293b` | Hover states, secondary elements |
| **Midnight 700** | `#334155` | Disabled states |

### Brand Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Brand 600** | `#3b82f6` | Active states, links, icons |
| **Brand 500** | `#60a5fa` | Hover states |
| **Brand 400** | `#93c5fd` | Light accents |

### Status Colors
| Color | Usage |
|-------|-------|
| `#10b981` | Success (green) |
| `#ef4444` | Error (red) |
| `#f59e0b` | Warning (orange) |

### Backgrounds
| Color | Hex | Usage |
|-------|-----|-------|
| **White** | `#ffffff` | Cards, panels |
| **Slate 50** | `#f8fafc` | Page background |
| **Slate 100** | `#f1f5f9` | Input backgrounds |

---

## 📐 SPACING & LAYOUT

### Border Radius
- **Cards:** `12px` (rounded-card)
- **Buttons:** `9999px` (rounded-pill)
- **Bottom Sheets:** `24px` top corners

### Shadows
```css
card: 0 2px 8px rgba(0, 0, 0, 0.08)
card-hover: 0 4px 16px rgba(0, 0, 0, 0.12)
float: 0 8px 24px rgba(0, 0, 0, 0.15)
```

### Spacing Scale
- **Tight:** `p-4` (16px)
- **Normal:** `p-6` (24px)
- **Loose:** `p-8` (32px)

---

## 🧩 COMPONENT LIBRARY

### 1. BUTTONS

#### Primary Button (Midnight)
```jsx
<button className="btn-primary">
  Continue
</button>
```
**Style:** Dark blue background, white text, pill-shaped, full width on mobile

#### Secondary Button (Brand Blue)
```jsx
<button className="btn-secondary">
  Accept Ride
</button>
```

#### Outline Button
```jsx
<button className="btn-outline">
  Cancel
</button>
```

#### Danger Button
```jsx
<button className="btn-danger">
  Decline
</button>
```

---

### 2. INPUT FIELDS

#### Uber-Style Input (Bottom Border)
```jsx
<input 
  type="text"
  placeholder="Where to?"
  className="input-uber"
/>
```
**Features:**
- Light gray background
- Bottom border only
- Transforms to brand blue on focus
- Smooth transition

#### Standard Input
```jsx
<input 
  type="text"
  className="input-standard"
/>
```

---

### 3. CARDS & PANELS

#### Floating Card
```jsx
<div className="card-float">
  <h3 className="text-lg font-bold mb-4">Card Title</h3>
  <p>Content here...</p>
</div>
```

#### Standard Card
```jsx
<div className="card">
  Content
</div>
```

#### Floating Panel (for dashboards)
```jsx
<div className="floating-panel">
  <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
  {/* Content */}
</div>
```

---

### 4. STATUS BADGES

```jsx
<span className="badge badge-pending">Pending</span>
<span className="badge badge-ongoing">On Going</span>
<span className="badge badge-completed">Completed</span>
<span className="badge badge-cancelled">Cancelled</span>
```

**Style:** Pill-shaped, pastel backgrounds, colored text

---

### 5. LOADING STATES

#### Shimmer Effect
```jsx
<div className="h-20 w-full shimmer rounded-lg"></div>
```

#### Skeleton Card
```jsx
<div className="card">
  <div className="shimmer h-6 w-3/4 mb-3 rounded"></div>
  <div className="shimmer h-4 w-full mb-2 rounded"></div>
  <div className="shimmer h-4 w-5/6 rounded"></div>
</div>
```

---

### 6. LAYOUTS

#### Map Background
```jsx
<div className="map-bg min-h-screen">
  {/* Floating content on top */}
</div>
```

#### Bottom Sheet (Mobile)
```jsx
<div className="bottom-sheet">
  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
  <h3 className="text-xl font-bold mb-4">Sheet Title</h3>
  {/* Content */}
</div>
```

---

## 📱 SCREEN DESIGNS

### 1. LOGIN / REGISTER

**Layout:** Split Screen
- **Left:** Illustration (Blue tones)
- **Right:** Form

**Form Elements:**
```jsx
<div className="min-h-screen flex">
  {/* Left - Illustration */}
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-midnight-900 to-brand-600 items-center justify-center">
    {/* City illustration */}
  </div>

  {/* Right - Form */}
  <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
    <div className="w-full max-w-md">
      <h1 className="text-4xl font-bold mb-2">Welcome to CityRide</h1>
      <p className="text-gray-600 mb-8">Enter your email to continue</p>

      <input 
        type="email"
        placeholder="Email address"
        className="input-uber mb-4"
      />

      <input 
        type="password"
        placeholder="Password"
        className="input-uber mb-6"
      />

      <button className="btn-primary w-full text-lg">
        Continue
      </button>
    </div>
  </div>
</div>
```

---

### 2. PASSENGER DASHBOARD

**Layout:** Floating panel over map background

```jsx
<div className="map-bg min-h-screen p-4 lg:p-8">
  <div className="max-w-md lg:max-w-lg mx-auto lg:ml-8">
    <div className="floating-panel">
      {/* Where to? Input */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Where to?</h2>

        {/* Pickup */}
        <div className="relative mb-3">
          <div className="absolute left-3 top-3 w-3 h-3 rounded-full bg-brand-600"></div>
          <input 
            placeholder="Pickup location"
            className="input-uber pl-10"
          />
        </div>

        {/* Connector Line */}
        <div className="w-px h-4 bg-gray-300 ml-5"></div>

        {/* Dropoff */}
        <div className="relative">
          <div className="absolute left-3 top-3 w-3 h-3 bg-midnight-900"></div>
          <input 
            placeholder="Dropoff location"
            className="input-uber pl-10"
          />
        </div>
      </div>

      <button className="btn-primary w-full">
        Request Ride
      </button>
    </div>

    {/* Recent Trips */}
    <div className="mt-6 card">
      <h3 className="font-bold mb-4">Recent Trips</h3>
      {/* Trip list */}
    </div>
  </div>
</div>
```

---

### 3. DRIVER DASHBOARD

**Layout:** Stats bar + Request cards

```jsx
<div className="map-bg min-h-screen">
  {/* Header with Toggle */}
  <div className="bg-white shadow-md p-4">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Go Online Toggle */}
        <button className="px-8 py-3 bg-success text-white rounded-pill font-semibold">
          🟢 Online
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        <div>
          <div className="text-sm text-gray-600">Earnings</div>
          <div className="text-xl font-bold text-brand-600">₺1,450.00</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Rating</div>
          <div className="text-xl font-bold">⭐ 4.9</div>
        </div>
      </div>
    </div>
  </div>

  {/* Request Card (when available) */}
  <div className="max-w-md mx-auto p-4 mt-8">
    <div className="card-float">
      {/* Countdown */}
      <div className="h-1 bg-gray-200 rounded-full mb-4">
        <div className="h-full bg-brand-600 rounded-full w-3/4"></div>
      </div>

      <h3 className="text-xl font-bold mb-4">New Ride Request</h3>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full bg-brand-600 mt-1"></div>
          <div>
            <div className="text-sm text-gray-600">Pickup</div>
            <div className="font-semibold">Ankara Merkez</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-3 h-3 bg-midnight-900 mt-1"></div>
          <div>
            <div className="text-sm text-gray-600">Dropoff</div>
            <div className="font-semibold">İstanbul Taksim</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">Estimated Fare:</div>
          <div className="text-lg font-bold text-brand-600">₺170.00</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-danger flex-1">
          Decline
        </button>
        <button className="btn-secondary flex-1">
          Accept
        </button>
      </div>
    </div>
  </div>
</div>
```

---

### 4. ADMIN TABLES

**Layout:** Clean data grid

```jsx
<div className="card">
  <h2 className="text-2xl font-bold mb-6">Pending Drivers</h2>

  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200">
        <th className="text-left text-xs uppercase text-gray-600 font-semibold py-3">Name</th>
        <th className="text-left text-xs uppercase text-gray-600 font-semibold py-3">License</th>
        <th className="text-left text-xs uppercase text-gray-600 font-semibold py-3">Status</th>
        <th className="text-left text-xs uppercase text-gray-600 font-semibold py-3">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-100 hover:bg-slate-50">
        <td className="py-4">John Doe</td>
        <td className="py-4">ABC123456</td>
        <td className="py-4">
          <span className="badge badge-pending">Pending</span>
        </td>
        <td className="py-4">
          <button className="text-brand-600 font-semibold hover:underline">
            Approve
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 🎭 ANIMATIONS

### Transitions
- **Button Clicks:** `active:scale-95` (micro-interaction)
- **Card Hover:** Shadow elevation increase
- **Input Focus:** Border color change + ring

### Loading States
- **Shimmer:** 2s linear infinite
- **Slide Up:** 0.3s ease-out (for bottom sheets)

### Custom Classes
```css
.shimmer - Animated skeleton loading
.animate-slide-up - Bottom sheet animation
```

---

## 📏 RESPONSIVE BREAKPOINTS

```
sm: 640px  - Mobile
md: 768px  - Tablet
lg: 1024px - Desktop
xl: 1280px - Large Desktop
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Setup
- [x] Install Tailwind CSS
- [x] Configure custom colors
- [x] Create design tokens
- [x] Setup custom components

### Phase 2: Core Components
- [ ] Button library
- [ ] Input components
- [ ] Card variants
- [ ] Badge components
- [ ] Loading skeletons

### Phase 3: Page Layouts
- [ ] Login/Register
- [ ] Passenger Dashboard
- [ ] Driver Dashboard
- [ ] Admin Tables

### Phase 4: Polish
- [ ] Micro-interactions
- [ ] Page transitions
- [ ] Mobile optimization
- [ ] Accessibility (ARIA labels)

---

## 🎨 DESIGN PRINCIPLES

1. **Clean & Minimal:** Plenty of whitespace
2. **Map-First:** Background suggests location context
3. **Floating Elements:** Cards hover above map
4. **Pill-Shaped:** Buttons and badges are fully rounded
5. **Smooth Transitions:** All interactions are animated
6. **Mobile-First:** Bottom sheets for mobile, panels for desktop

---

**End of Design System Documentation**
