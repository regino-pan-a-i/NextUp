# NextUp - Design Guidelines

## Design Approach

**Reference-Based Strategy**: Drawing inspiration from Instagram's visual card system, Notion's status workflows, and Airbnb's experience-focused design to create a modern, mobile-first social bucket list platform.

**Core Design Principles**:
- Mobile-first with touch-optimized interactions
- Visual hierarchy emphasizing experiences and social connections
- Clear status progression and workflow visibility
- Card-based discovery and content consumption
- Streamlined navigation for quick access to key features

---

## Typography System

**Font Families**:
- Primary: Inter (via Google Fonts) - clean, modern sans-serif for UI elements
- Accent: Poppins (via Google Fonts) - slightly playful for headings and experience titles

**Type Scale**:
- Hero/Display: text-4xl to text-5xl, font-bold (Poppins)
- Page Headers: text-3xl, font-semibold (Poppins)
- Section Titles: text-2xl, font-semibold (Poppins)
- Card Titles: text-xl, font-semibold (Inter)
- Body Text: text-base, font-normal (Inter)
- Metadata/Labels: text-sm, font-medium (Inter)
- Captions: text-xs, font-normal (Inter)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (between related elements)
- Section spacing: py-8, py-12 (between major sections)
- Large spacing: py-16 (page-level separation)

**Container Strategy**:
- Mobile-first: Full-width with px-4 padding
- Desktop: max-w-7xl mx-auto for main content areas
- Narrow content: max-w-2xl mx-auto for forms and focused content

**Grid Patterns**:
- Experience cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Adventure planning: Single column on mobile, 2-column layouts for desktop splits
- Friend lists: Single column with compact rows

---

## Component Library

### Navigation
**Bottom Tab Bar (Mobile Primary)**:
- Fixed bottom navigation with 4-5 primary tabs: Home, Experiences, Adventures, Friends, Profile
- Icons from Heroicons (outline style)
- Active state with filled icons and underline indicator
- Height: h-16 with safe area padding

**Top App Bar**:
- Sticky header with app logo/title on left
- Action buttons (add new, notifications, settings) on right
- Height: h-14, shadow-sm for elevation

### Experience Cards
**Standard Experience Card**:
- Aspect ratio container (16:9) for experience images
- Overlay gradient for image cards with title/category
- Card body with: title (text-xl font-semibold), category badge, time/money metadata row
- Status badge (Pending/NextUp/InProgress/Completed) in top-right corner
- Recommended by attribution at bottom
- Hover/tap state: subtle scale transform (scale-[1.02])
- Padding: p-4, rounded-xl, shadow-md

**Detailed Experience View**:
- Full-width hero image (aspect-[4:3])
- Content area with generous padding (p-6)
- Status workflow visual (horizontal progress indicator)
- Metadata grid: 2 columns for time/money/place
- Description in max-w-prose
- Opinion/feedback section with textarea appearance
- Action buttons: Edit, Share, Delete in horizontal row at bottom

### Adventure Cards
**Adventure Card**:
- Compact horizontal card layout
- Left: Date block (calendar icon + formatted date) in fixed-width container (w-20)
- Right: Adventure details (title, location, attendees avatars, cost/time)
- Status indicator: "Pending Response" / "Accepted" / "Declined" badge
- Attendee avatars in overlapping stack (max 4 visible + count)
- Padding: p-4, rounded-lg, border-2

**Adventure Planning Interface**:
- Multi-step form layout
- Section 1: Experience selection (searchable dropdown)
- Section 2: Date/time picker (calendar interface)
- Section 3: Friend selection (checkbox list with avatars)
- Section 4: Details (place autocomplete, cost estimate, notes)
- Progress indicator at top showing current step
- Sticky bottom action bar with Back/Continue buttons

### Friends Components
**Friend List Item**:
- Horizontal layout with avatar (left), name/username (center), action button (right)
- Avatar: rounded-full, w-12 h-12
- Two-line text: Name (font-semibold) + username/email (text-sm)
- Action button: "Add Friend" / "Pending" / "Friends" state
- Divider between items

**Friend Search**:
- Search input with search icon prefix
- Real-time results display below
- Empty state illustration when no results
- Recent searches suggestions

### Forms & Inputs
**Text Inputs**:
- Height: h-12
- Padding: px-4
- Border: border-2, rounded-lg
- Label above input: text-sm font-medium, mb-2
- Focus state: ring-2 offset-2

**Buttons**:
- Primary: Large (h-12), rounded-lg, font-semibold, full-width on mobile
- Secondary: Same size, outlined style
- Icon buttons: Square (h-10 w-10), rounded-full
- Destructive actions: Outlined in cautionary styling

**Select/Dropdown**:
- Match text input styling
- Chevron icon on right
- Custom styled options (avoid native select appearance)

**Status Selector**:
- Horizontal pill navigation
- 5 status options as toggleable pills
- Active state: filled, font-semibold
- Inactive state: outlined, font-normal
- Gap: gap-2

### Badges & Tags
**Category Badge**:
- Small rounded-full pills
- Padding: px-3 py-1
- Font: text-xs font-medium
- Used for categories (Food, Movies, Travel, etc.)

**Status Badge**:
- Rounded-md, px-2 py-1
- Text: text-xs font-bold uppercase
- Positioned absolute on cards (top-2 right-2)

### Authentication Screens
**Login/Register Forms**:
- Centered card on desktop (max-w-md)
- Full-screen on mobile with top logo area
- Form fields stacked with gap-4
- Large, prominent CTA button
- Secondary action link below (text-sm, underline)
- Divider with "or" text between login/register toggle
- Input validation messages inline (text-sm below field)

### Empty States
**No Experiences Yet**:
- Centered illustration/icon (large size, mb-6)
- Heading: "Start Your Bucket List" (text-2xl font-bold)
- Description: Encouraging text (text-base)
- Large CTA button: "Add First Experience"
- Container: py-16, text-center

**No Friends Added**:
- Similar pattern with search friends CTA

### Filter & Sort Interface
**Filter Bar**:
- Horizontal scrollable pill buttons (category filters)
- "All" as default selected
- Smooth scroll behavior on mobile
- Padding: py-3

**Sort Dropdown**:
- Compact dropdown in top-right of lists
- Options: Recent, Alphabetical, By Status, By Cost

---

## Page Layouts

### Home/Dashboard
- Welcome header with user name and quick stats (total experiences, completed, friends)
- "NextUp" highlighted section (max 3 upcoming experiences in prominent cards)
- Recent activity feed (friend recommendations, adventure invites)
- Quick action FAB (Floating Action Button) for adding experience

### Experiences List
- Top filter bar for categories
- Sort/view options (grid vs list toggle)
- Masonry grid of experience cards on desktop
- Single column stacked on mobile
- Infinite scroll or pagination

### Experience Detail
- Full-screen modal on mobile
- Slide-in panel on desktop
- Close button top-left
- Share button top-right
- Scrollable content area

### Adventures
- Tab navigation: Upcoming / Past / Invitations
- Card list appropriate to each tab
- Create Adventure FAB

### Friends
- Search bar at top (sticky)
- Tabbed interface: My Friends / Pending / Find Friends
- Alphabetical section headers for organized lists

### Profile
- Top profile header (avatar, name, stats row: experiences/adventures/friends counts)
- Edit profile button
- Settings access
- Account management options
- Logout at bottom

---

## Animations
**Subtle Motion Only**:
- Card hover: transform scale-[1.02] transition-transform duration-200
- Page transitions: Slide-in for navigation (not cross-fade)
- Loading states: Simple spinner, no complex skeletons
- Pull-to-refresh: Native mobile pattern

---

## Images

### Hero Image
- No traditional hero section needed (mobile-first utility app)
- App focuses on content cards with user-uploaded experience photos

### Experience Images
- User-uploaded photos as primary visual element
- Fallback: Category-based gradient backgrounds with icon when no photo
- Image treatment: Slight overlay gradient for text readability on cards
- Upload UI: Drag-drop zone on desktop, camera/gallery picker on mobile

### Avatars
- User profile photos throughout friend interfaces
- Circular crop, consistent sizing (w-10 h-10 default, w-12 h-12 in headers)
- Fallback: Initials on gradient background