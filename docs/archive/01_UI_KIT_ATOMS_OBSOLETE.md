# Spec: Base UI Kit (Atoms)

## 1. Goal
Create a set of "Atomic" UI components in `layers/base/components/ui`.
These must be **dumb**, **stateless**, and **styled** via Tailwind CSS.

## 2. Technical Constraints
- **Framework**: Nuxt 4 (Vue 3 script setup)
- **Style**: Tailwind CSS
- **Props**: Strongly typed interfaces

## 3. Components to Build

### 3.1 `BaseButton.vue`
- **Props**:
  - `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
  - `size`: 'sm' | 'md' | 'lg' (default: 'md')
  - `block`: boolean (full width)
  - `disabled`: boolean
  - `loading`: boolean
- **Slots**:
  - `default`: Button text/content
  - `leadin`: Icon before text

### 3.2 `BaseInput.vue`
- **Props**:
  - `modelValue`: string | number
  - `label`: string (optional)
  - `placeholder`: string
  - `error`: string (optional validation message)
  - `type`: 'text' | 'password' | 'email' | 'number'
- **Events**:
  - `update:modelValue`

### 3.3 `BaseCard.vue`
- **Props**:
  - `padding`: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
- **Slots**:
  - `header`: Title area
  - `default`: Main content
  - `footer`: Action area

## 4. Testing
- Create a `pages/ui-kitchen-sink.vue` (in `layers/base`) to display all variations of these components for verification.
