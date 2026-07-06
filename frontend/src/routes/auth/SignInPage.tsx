import { SignIn } from "@clerk/clerk-react";

export function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your account
          </p>
        </div>
        
        <div className="flex justify-center">
          <SignIn 
            routing="path" 
            path="/sign-in" 
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full shadow-xl bg-card border border-border/50 rounded-2xl",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                footerActionLink: "text-primary hover:text-primary/90"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
