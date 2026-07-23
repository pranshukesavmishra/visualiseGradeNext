// Ready-made programs, from very simple to more exciting, so a learner can
// press a button and immediately watch something come alive.

export interface Example {
  id: string
  title: string
  emoji: string
  grade: string
  description: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'counting',
    title: 'Counting Stars',
    emoji: '⭐',
    grade: 'Grades 2–3',
    description: 'Count from 1 to 5 and print a star each time.',
    code: `# Let's count to five!
for i in range(1, 6):
    print("Star number", i)
print("Done counting!")`,
  },
  {
    id: 'countdown',
    title: 'Rocket Countdown',
    emoji: '🚀',
    grade: 'Grades 2–4',
    description: 'Count down from 5, then blast off.',
    code: `# Countdown to blast off
count = 5
while count > 0:
    print(count)
    count = count - 1
print("Blast off!")`,
  },
  {
    id: 'evens',
    title: 'Odd or Even',
    emoji: '🔢',
    grade: 'Grades 3–5',
    description: 'Look at each number and decide if it is odd or even.',
    code: `numbers = [4, 7, 10, 3, 8]
for n in numbers:
    if n % 2 == 0:
        print(n, "is even")
    else:
        print(n, "is odd")`,
  },
  {
    id: 'total',
    title: 'Add Up the Scores',
    emoji: '🏆',
    grade: 'Grades 4–6',
    description: 'Walk through a list and keep a running total.',
    code: `scores = [10, 25, 5, 40, 15]
total = 0
for s in scores:
    total = total + s
    print("Running total:", total)
print("Final score:", total)`,
  },
  {
    id: 'biggest',
    title: 'Find the Biggest',
    emoji: '🔍',
    grade: 'Grades 5–7',
    description: 'Compare numbers one by one to find the largest.',
    code: `numbers = [3, 9, 2, 8, 5]
biggest = numbers[0]
for n in numbers:
    if n > biggest:
        biggest = n
print("The biggest number is", biggest)`,
  },
  {
    id: 'bubblesort',
    title: 'Sorting Machine',
    emoji: '📊',
    grade: 'Grades 6–8',
    description: 'Watch bars swap places until the list is sorted small to big.',
    code: `# Bubble sort: swap neighbours until it's sorted
nums = [5, 2, 8, 1, 9, 3]
n = len(nums)
for i in range(n):
    for j in range(n - 1 - i):
        if nums[j] > nums[j + 1]:
            temp = nums[j]
            nums[j] = nums[j + 1]
            nums[j + 1] = temp
print("Sorted:", nums)`,
  },
  {
    id: 'fibonacci',
    title: 'Rabbit Numbers',
    emoji: '🐰',
    grade: 'Grades 6–8',
    description: 'Each number is the sum of the two before it (Fibonacci).',
    code: `# Fibonacci: add the last two numbers
a = 0
b = 1
for i in range(8):
    print(a)
    next = a + b
    a = b
    b = next`,
  },
]

export const DEFAULT_EXAMPLE = EXAMPLES[0]
