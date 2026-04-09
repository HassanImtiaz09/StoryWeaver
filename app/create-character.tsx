// @ts-nocheck
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { PhotoUploadCard } from "@/components/photo-upload-card";
import { AvatarStylePicker } from "@/components/avatar-style-picker";
import { AvatarGallery } from "@/components/avatar-gallery";
import { CharacterPreview } from "@/components/character-preview";
import {
  useCharacterAvatarStore,
  useCharacterAvatarFlow,
  type ArtStyle,
} from "@/lib/character-avatar";
import { trpc } from "@/lib/trpc";

type Step = "upload" | "style" | "generate" | "select" | "confirm";

export default function CreateCharacterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { childId: childIdParam, childName: childNameParam } =
    useLocalSearchParams<{
      childId: string;
      childName: string;
    }>();

  const childId = childIdParam ? parseInt(childIdParam, 10) : 0;
  const childName = childNameParam || "Child";

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>("watercolor");
  const [isProcessing, setIsProcessing] = useState(false);

  const store = useCharacterAvatarStore();
  const flow = useCharacterAvatarFlow(childId);

  const selectedAvatar = store.getSelectedAvatar(childId);
  const generatedAvatars = store.generatedAvatars[childId] || [];
  const uploadedPhoto = store.getUploadedPhoto(childId);

  // API mutations
  const analyzePhotoMutation = trpc.character.analyzePhoto.useMutation();
  const generateAvatarsMutation = trpc.character.generateAvatars.useMutation();
  const selectAvatarMutation = trpc.character.selectAvatar.useMutation();

  const handlePhotoSelected = useCallback(
    async (photoUri: string, base64: string) => {
      try {
        setIsProcessing(true);
        flow.setError(null);
        flow.setProgress(10);

        // Upload and analyze the photo
        await flow.uploadPhoto(photoUri, base64);
        flow.setProgress(30);

        // Analyze the photo using the API
        const analysisResult = await analyzePhotoMutation.mutateAsync({
          photoBase64: base64,
          childName,
          childAge: 8, // Default age, could be fetched from child profile
        });

        flow.setProgress(50);
        setCurrentStep("style");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to analyze photo";
        flow.setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [childName, flow, analyzePhotoMutation]
  );

  const handleStyleSelected = useCallback(async (style: ArtStyle) => {
    setSelectedStyle(style);
  }, []);

  const handleGenerateAvatars = useCallback(async () => {
    const photo = uploadedPhoto;
    if (!photo || !photo.base64) {
      Alert.alert("Error", "No photo available. Please upload a photo first.");
      return;
    }

    try {
      setIsProcessing(true);
      flow.setError(null);
      flow.setCurrentStep("generate");
      setCurrentStep("generate");

      // Generate avatars using the API
      const generateResult = await generateAvatarsMutation.mutateAsync({
        photoBase64: photo.base64,
        artStyle: selectedStyle,
        childName,
        count: 3,
      });

      // Convert API result to store format
      const avatarVariants = generateResult.variants.map((v, idx) => ({
        id: `avatar-${Date.now()}-${idx}`,
        portrait: v.portrait,
        fullBody: v.fullBody,
        actionPose: v.actionPose,
        description: v.description,
        artStyle: selectedStyle,
        createdAt: new Date(),
      }));

      flow.addGeneratedAvatars(avatarVariants);
      setCurrentStep("select");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate avatars";
      flow.setError(errorMessage);
      Alert.alert("Error", errorMessage);
      setCurrentStep("style");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedPhoto, selectedStyle, childName, flow, generateAvatarsMutation]);

  const handleSelectAvatar = useCallback(
    (avatarId: string) => {
      flow.selectAvatar(avatarId);
      setCurrentStep("confirm");
    },
    [flow]
  );

  const handleSaveCharacter = useCallback(async () => {
    if (!selectedAvatar) {
      Alert.alert("Error", "No avatar selected");
      return;
    }

    try {
      setIsProcessing(true);
      flow.setError(null);

      // Save the selected avatar
      await selectAvatarMutation.mutateAsync({
        childId,
        avatarId: selectedAvatar.id,
        description: selectedAvatar.description,
        artStyle: selectedAvatar.artStyle,
        variants: {
          portrait: selectedAvatar.variants.portrait,
          fullBody: selectedAvatar.variants.fullBody,
          actionPose: selectedAvatar.variants.actionPose,
        },
      });

      Alert.alert("Success!", "Character created successfully!", [
        {
          text: "OK",
          onPress: () => {
            flow.clearAvatars();
            router.back();
          },
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save character";
      flow.setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAvatar, childId, flow, selectAvatarMutation, router]);

  const handleSkip = useCallback(() => {
    flow.clearAvatars();
    router.back();
  }, [flow, router]);

  const handleBack = useCallback(() => {
    if (currentStep === "upload") {
      handleSkip();
      return;
    }

    const stepOrder: Step[] = ["upload", "style", "generate", "select", "confirm"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep, handleSkip]);

  const handleNext = useCallback(async () => {
    switch (currentStep) {
      case "upload":
        if (!uploadedPhoto) {
          Alert.alert("Error", "Please upload a photo first");
          return;
        }
        setCurrentStep("style");
        break;

      case "style":
        await handleGenerateAvatars();
        break;

      case "select":
        if (!selectedAvatar) {
          Alert.alert("Error", "Please select an avatar");
          return;
        }
        setCurrentStep("confirm");
        break;

      case "generate":
        // Auto-advance when generation completes
        break;

      case "confirm":
        await handleSaveCharacter();
        break;
    }
  }, [currentStep, uploadedPhoto, selectedAvatar, handleGenerateAvatars, handleSaveCharacter]);

  const getProgressPercentage = (): number => {
    const steps: Step[] = ["upload", "style", "generate", "select", "confirm"];
    const index = steps.indexOf(currentStep);
    return Math.round(((index + 1) / steps.length) * 100);
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case "upload":
        return "Upload a Photo";
      case "style":
        return "Choose Art Style";
      case "generate":
        return "Generating Character";
      case "select":
        return "Select Your Avatar";
      case "confirm":
        return "Confirm Character";
      default:
        return "";
    }
  };

  const isNextDisabled = (): boolean => {
    if (isProcessing || store.isGenerating) return true;

    switch (currentStep) {
      case "upload":
        return !uploadedPhoto;
      case "style":
        return false;
      case "generate":
        return true;
      case "select":
        return !selectedAvatar;
      case "confirm":
        return false;
      default:
        return true;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} disabled={isProcessing}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {getStepTitle()}
          </Text>
        </View>

        <Pressable onPress={handleSkip} disabled={isProcessing}>
          <Text style={[styles.skipButton, { color: colors.primary }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${getProgressPercentage()}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      {/* Step Counter */}
      <View style={styles.stepCounter}>
        <Text style={[styles.stepText, { color: colors.muted }]}>
          Step {["upload", "style", "generate", "select", "confirm"].indexOf(currentStep) + 1} of 5
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentStep === "upload" && (
          <PhotoUploadCard
            onPhotoSelected={handlePhotoSelected}
            isLoading={isProcessing}
            photoUri={uploadedPhoto?.uri}
          />
        )}

        {currentStep === "style" && (
          <AvatarStylePicker
            selectedStyle={selectedStyle}
            onStyleSelected={handleStyleSelected}
          />
        )}

        {currentStep === "generate" && (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.generatingText, { color: colors.foreground }]}>
              Generating your character...
            </Text>
            <Text style={[styles.generatingSubtext, { color: colors.muted }]}>
              This may take a minute
            </Text>
            {store.generationProgress > 0 && (
              <>
                <View
                  style={[
                    styles.genProgressBar,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.genProgressFill,
                      {
                        width: `${store.generationProgress}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercent, { color: colors.muted }]}>
                  {store.generationProgress}%
                </Text>
              </>
            )}
          </View>
        )}

        {currentStep === "select" && (
          <AvatarGallery
            variants={generatedAvatars}
            selectedAvatarId={selectedAvatar?.id}
            onSelectAvatar={handleSelectAvatar}
            isGenerating={store.isGenerating}
          />
        )}

        {currentStep === "confirm" && selectedAvatar && (
          <CharacterPreview
            avatar={selectedAvatar}
            childName={childName}
            isLoading={isProcessing}
          />
        )}

        {store.error && (
          <View style={[styles.errorBox, { borderColor: colors.primary }]}>
            <Ionicons name="alert-circle" size={20} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.primary }]}>
              {store.error}
            </Text>
          </View>
        )}
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleBack}
          disabled={isProcessing || currentStep === "upload"}
          style={({ pressed }) => [
            styles.backButton,
            {
              borderColor: colors.border,
              opacity:
                pressed || isProcessing || currentStep === "upload" ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.backButtonText, { color: colors.foreground }]}>
            Back
          </Text>
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={isNextDisabled()}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: colors.primary,
              opacity: isNextDisabled() || pressed ? 0.5 : 1,
            },
          ]}
        >
          {store.isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === "confirm" ? "Save Character" : "Next"}
              </Text>
              {currentStep !== "confirm" && (
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              )}
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    height: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    transition: "width 0.3s ease-in-out",
  },
  stepCounter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  generatingText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  generatingSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  genProgressBar: {
    width: 200,
    height: 6,
    borderRadius: 3,
    marginTop: 20,
    overflow: "hidden",
  },
  genProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    marginTop: 8,
  },
  errorBox: {
    marginHorizontal: 20,
    marginVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
