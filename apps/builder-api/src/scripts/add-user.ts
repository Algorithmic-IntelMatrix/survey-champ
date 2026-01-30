import { AuthService } from "../services/auth.service";
import { SignupSchema } from "@surveychamp/common";

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.error("Usage: pnpm add-user <name> <email> <password>");
        process.exit(1);
    }

    const [name, email, password] = args;

    try {
        // Validate input
        const validation = SignupSchema.safeParse({ name, email, password });
        if (!validation.success) {
            console.error("❌ Validation failed:", validation.error.issues.map((e: any) => e.message).join(", "));
            process.exit(1);
        }

        console.log(`⏳ Adding user: ${name} (${email})...`);
        
        const user = await AuthService.signup({ name, email, password });
        
        console.log("✅ User created successfully!");
        console.log("User details:", {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
        });

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error adding user:", error.message);
        process.exit(1);
    }
}

main();
