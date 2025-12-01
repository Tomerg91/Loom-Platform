import { FileText, Mail, Upload, User } from "lucide-react";
import { FormEvent } from "react";
import { type AuthUser } from "wasp/auth";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";

type UserProfile = AuthUser & {
  fullName?: string;
  phoneNumber?: string;
  bio?: string;
};

const SettingsPage = ({ user }: { user: AuthUser }) => {
  const profile = user as UserProfile;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire up persistence once the profile update endpoint is available.
  };

  return (
    <DefaultLayout user={user}>
      <div className="max-w-270 mx-auto">
        <Breadcrumb pageName="Settings" />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="mb-5.5 gap-5.5 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="full-name"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                        <Input
                          className="pl-11.5"
                          type="text"
                          name="fullName"
                          id="full-name"
                          defaultValue={profile.fullName ?? ""}
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="phone-number"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Phone Number
                      </Label>
                      <Input
                        type="tel"
                        name="phoneNumber"
                        id="phone-number"
                        defaultValue={profile.phoneNumber ?? ""}
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="email-address"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                      <Input
                        className="pl-11.5"
                        type="email"
                        name="emailAddress"
                        id="email-address"
                        defaultValue={user.email ?? ""}
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="username"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      Username
                    </Label>
                    <Input
                      type="text"
                      name="username"
                      id="username"
                      defaultValue={user.username ?? ""}
                    />
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="bio"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      BIO
                    </Label>
                    <div className="relative">
                      <FileText className="left-4.5 text-muted-foreground absolute top-4 h-5 w-5" />
                      <Textarea
                        className="border-border bg-background pl-11.5 pr-4.5 text-foreground focus:border-primary w-full rounded border py-3 focus-visible:outline-none"
                        name="bio"
                        id="bio"
                        rows={6}
                        defaultValue={profile.bio ?? ""}
                      ></Textarea>
                    </div>
                  </div>

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="submit">
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <form action="#">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="bg-muted h-14 w-14 rounded-full" />
                    <div>
                      <span className="text-foreground mb-1.5">
                        Edit your photo
                      </span>
                      <span className="flex gap-2.5">
                        <button className="hover:text-primary text-sm">
                          Delete
                        </button>
                        <button className="hover:text-primary text-sm">
                          Update
                        </button>
                      </span>
                    </div>
                  </div>

                  <div
                    id="FileUpload"
                    className="mb-5.5 border-primary bg-background sm:py-7.5 relative block w-full cursor-pointer appearance-none rounded border-2 border-dashed px-4 py-4"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-none"
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <span className="border-border bg-background flex h-10 w-10 items-center justify-center rounded-full border">
                        <Upload className="text-primary h-4 w-4" />
                      </span>
                      <p>
                        <span className="text-primary">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="mt-1.5">SVG, PNG, JPG or GIF</p>
                      <p>(max, 800 X 800px)</p>
                    </div>
                  </div>

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="submit">
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SettingsPage;
