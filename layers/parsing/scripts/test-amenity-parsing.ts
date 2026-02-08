/**
 * Bench Test: Amenity Parsing Logic
 * Verifies that the <br> separated string from Yardi reports is correctly split and cleaned.
 */

const testParsing = (amenitiesStr: string) => {
    // Logic from useSolverEngine.ts
    const fragments = amenitiesStr.split(/<br\s*\/?>/i)
        .map(f => f.trim())
        .filter(Boolean)
    
    return fragments
}

const runTests = () => {
    const cases = [
        {
            input: "Level 02<br>Park View<br>New Carpet",
            expected: ["Level 02", "Park View", "New Carpet"]
        },
        {
            input: "Top Floor <br/> Renovated",
            expected: ["Top Floor", "Renovated"]
        },
        {
            input: "Balcony<br><br>Gated",
            expected: ["Balcony", "Gated"]
        },
        {
            input: "Single Amenity",
            expected: ["Single Amenity"]
        },
        {
            input: "",
            expected: []
        }
    ]

    let allPassed = true
    cases.forEach((c, idx) => {
        const result = testParsing(c.input)
        const passes = JSON.stringify(result) === JSON.stringify(c.expected)
        console.log(`Test Case ${idx + 1}: ${passes ? '✅' : '❌'}`)
        if (!passes) {
            console.log(`  Input: ${c.input}`)
            console.log(`  Expected: ${JSON.stringify(c.expected)}`)
            console.log(`  Actual:   ${JSON.stringify(result)}`)
            allPassed = false
        }
    })

    return allPassed
}

if (runTests()) {
    console.log("\nAll parsing tests passed! 🚀")
} else {
    process.exit(1)
}
